/**
 * Fast EXIF Parser for JPEG images and Geolocation Helper
 */

export interface ExifInfo {
  timestamp?: number;
  latitude?: number;
  longitude?: number;
}

export function getCurrentDeviceLocation(): Promise<{ latitude: number; longitude: number; accuracy: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy),
        });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
    );
  });
}

/**
 * Extract EXIF metadata from ArrayBuffer or File
 */
export async function extractExifFromBlob(file: Blob): Promise<ExifInfo> {
  try {
    const buffer = await file.slice(0, 128 * 1024).arrayBuffer();
    const view = new DataView(buffer);

    if (view.getUint16(0, false) !== 0xFFD8) {
      return {}; // Not a JPEG
    }

    let offset = 2;
    const length = view.byteLength;

    while (offset < length) {
      if (view.getUint8(offset) !== 0xFF) break;
      const marker = view.getUint8(offset + 1);

      if (marker === 0xE1) {
        // APP1 Marker (Exif)
        const app1Length = view.getUint16(offset + 2, false);
        const exifHeader = view.getUint32(offset + 4, false);
        if (exifHeader === 0x45786966) { // "Exif"
          return parseExifTiff(view, offset + 10, app1Length - 8);
        }
        offset += 2 + app1Length;
      } else if (marker === 0xD9 || marker === 0xDA) {
        break; // End of image or Start of scan
      } else {
        const markerLength = view.getUint16(offset + 2, false);
        offset += 2 + markerLength;
      }
    }
  } catch {
    // Non-blocking fallback
  }

  return {};
}

function parseExifTiff(view: DataView, tiffStart: number, _maxLen: number): ExifInfo {
  const info: ExifInfo = {};
  const isLittleEndian = view.getUint16(tiffStart, false) === 0x4949;

  const firstIfdOffset = view.getUint32(tiffStart + 4, isLittleEndian);
  if (firstIfdOffset < 8) return info;

  // Read IFD0 tags
  let gpsIfdOffset = 0;
  let exifSubIfdOffset = 0;

  const ifd0 = tiffStart + firstIfdOffset;
  const numEntries = view.getUint16(ifd0, isLittleEndian);

  for (let i = 0; i < numEntries; i++) {
    const entry = ifd0 + 2 + i * 12;
    const tag = view.getUint16(entry, isLittleEndian);
    if (tag === 0x8825) { // GPS Info IFD
      gpsIfdOffset = view.getUint32(entry + 8, isLittleEndian);
    } else if (tag === 0x8769) { // Exif SubIFD
      exifSubIfdOffset = view.getUint32(entry + 8, isLittleEndian);
    }
  }

  // Parse GPS if available
  if (gpsIfdOffset > 0) {
    const gpsDir = tiffStart + gpsIfdOffset;
    const gpsEntries = view.getUint16(gpsDir, isLittleEndian);
    let latRef = 'N';
    let lonRef = 'W';
    let latVal: number[] | null = null;
    let lonVal: number[] | null = null;

    for (let i = 0; i < gpsEntries; i++) {
      const entry = gpsDir + 2 + i * 12;
      const tag = view.getUint16(entry, isLittleEndian);
      if (tag === 0x0001) { // LatRef
        latRef = String.fromCharCode(view.getUint8(entry + 8));
      } else if (tag === 0x0002) { // Lat
        const valOffset = tiffStart + view.getUint32(entry + 8, isLittleEndian);
        latVal = [
          readRational(view, valOffset, isLittleEndian),
          readRational(view, valOffset + 8, isLittleEndian),
          readRational(view, valOffset + 16, isLittleEndian),
        ];
      } else if (tag === 0x0003) { // LonRef
        lonRef = String.fromCharCode(view.getUint8(entry + 8));
      } else if (tag === 0x0004) { // Lon
        const valOffset = tiffStart + view.getUint32(entry + 8, isLittleEndian);
        lonVal = [
          readRational(view, valOffset, isLittleEndian),
          readRational(view, valOffset + 8, isLittleEndian),
          readRational(view, valOffset + 16, isLittleEndian),
        ];
      }
    }

    if (latVal && lonVal) {
      let lat = latVal[0] + latVal[1] / 60 + latVal[2] / 3600;
      let lon = lonVal[0] + lonVal[1] / 60 + lonVal[2] / 3600;
      if (latRef === 'S') lat = -lat;
      if (lonRef === 'W') lon = -lon;
      info.latitude = Number(lat.toFixed(6));
      info.longitude = Number(lon.toFixed(6));
    }
  }

  // Parse Date/Time Original
  if (exifSubIfdOffset > 0) {
    const subIfd = tiffStart + exifSubIfdOffset;
    const subEntries = view.getUint16(subIfd, isLittleEndian);
    for (let i = 0; i < subEntries; i++) {
      const entry = subIfd + 2 + i * 12;
      const tag = view.getUint16(entry, isLittleEndian);
      if (tag === 0x9003) { // DateTimeOriginal
        const valOffset = tiffStart + view.getUint32(entry + 8, isLittleEndian);
        let dateStr = '';
        for (let c = 0; c < 19; c++) {
          dateStr += String.fromCharCode(view.getUint8(valOffset + c));
        }
        // format: "YYYY:MM:DD HH:MM:SS"
        const parts = dateStr.split(' ');
        if (parts.length === 2) {
          const dParts = parts[0].replace(/:/g, '-');
          const parsed = Date.parse(`${dParts}T${parts[1]}`);
          if (!isNaN(parsed)) info.timestamp = parsed;
        }
      }
    }
  }

  return info;
}

function readRational(view: DataView, offset: number, littleEndian: boolean): number {
  const num = view.getUint32(offset, littleEndian);
  const den = view.getUint32(offset + 4, littleEndian);
  return den === 0 ? 0 : num / den;
}
