import { BoundingBox, HsvFilterParams } from '../../types/citrus';

export interface ColorDetectionResult {
  boxes: BoundingBox[];
  processTimeMs: number;
  maskCanvas?: HTMLCanvasElement;
}

export class FastAdaptiveColorDetector {
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;

  constructor() {
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true })!;
  }

  /**
   * Convert RGB to HSV
   * r, g, b in [0, 255]
   * returns: h in [0, 360], s in [0, 100], v in [0, 100]
   */
  private static rgbToHsv(r: number, g: number, b: number): [number, number, number] {
    const rf = r / 255;
    const gf = g / 255;
    const bf = b / 255;

    const max = Math.max(rf, gf, bf);
    const min = Math.min(rf, gf, bf);
    const delta = max - min;

    let h = 0;
    if (delta > 0.00001) {
      if (max === rf) {
        h = 60 * (((gf - bf) / delta) % 6);
      } else if (max === gf) {
        h = 60 * ((bf - rf) / delta + 2);
      } else {
        h = 60 * ((rf - gf) / delta + 4);
      }
      if (h < 0) h += 360;
    }

    const s = max === 0 ? 0 : (delta / max) * 100;
    const v = max * 100;

    return [h, s, v];
  }

  /**
   * Run detection on any image source (Video, Image, Canvas)
   */
  public detect(
    source: CanvasImageSource,
    sourceWidth: number,
    sourceHeight: number,
    params: HsvFilterParams,
    generateMask = false
  ): ColorDetectionResult {
    const startTime = performance.now();

    // Scale down for ultra-fast processing (max dimension ~480px)
    const maxDim = 480;
    const scale = Math.min(1, maxDim / Math.max(sourceWidth, sourceHeight));
    const procW = Math.max(64, Math.round(sourceWidth * scale));
    const procH = Math.max(64, Math.round(sourceHeight * scale));

    if (this.offscreenCanvas.width !== procW || this.offscreenCanvas.height !== procH) {
      this.offscreenCanvas.width = procW;
      this.offscreenCanvas.height = procH;
    }

    this.offscreenCtx.drawImage(source, 0, 0, procW, procH);
    const imgData = this.offscreenCtx.getImageData(0, 0, procW, procH);
    const data = imgData.data;
    const totalPixels = procW * procH;

    // Optional adaptive luminance factor
    let lumGain = 1.0;
    if (params.adaptiveLuminance) {
      let sumLum = 0;
      // sample every 8th pixel for speed
      const step = 8;
      let sampled = 0;
      for (let i = 0; i < totalPixels * 4; i += 4 * step) {
        sumLum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        sampled++;
      }
      const meanLum = sumLum / Math.max(1, sampled);
      // Target median luminance ~ 120
      if (meanLum < 75) lumGain = 1.25;      // deep canopy shade
      else if (meanLum > 175) lumGain = 0.85; // harsh midday sunlight
    }

    // 1. Thresholding to Binary Mask
    const binaryMask = new Uint8Array(totalPixels);
    const { hMin, hMax, sMin, sMax, vMin, vMax } = params;

    // Fast check handling hue wrap-around (e.g., orange/red across 350-20)
    const hueWrap = hMin > hMax;

    for (let i = 0, p = 0; i < totalPixels * 4; i += 4, p++) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      if (lumGain !== 1.0) {
        r = Math.min(255, r * lumGain);
        g = Math.min(255, g * lumGain);
        b = Math.min(255, b * lumGain);
      }

      const [h, s, v] = FastAdaptiveColorDetector.rgbToHsv(r, g, b);

      const hMatch = hueWrap
        ? h >= hMin || h <= hMax
        : h >= hMin && h <= hMax;

      if (hMatch && s >= sMin && s <= sMax && v >= vMin && v <= vMax) {
        binaryMask[p] = 1;
      }
    }

    // 2. Morphological Operations (Erosion followed by Dilation: Opening to remove noise)
    let processedMask: Uint8Array = binaryMask;
    if (params.morphologyIterations > 0) {
      processedMask = this.morphologyOpening(binaryMask, procW, procH);
    }

    // 3. Connected Components Analysis with BFS
    const visited = new Uint8Array(totalPixels);
    const boxes: BoundingBox[] = [];

    // Scale min/max radius from full size to processing size
    const minR = Math.max(2, Math.round(params.minRadius * scale));
    const maxR = Math.max(minR + 2, Math.round(params.maxRadius * scale));
    const minArea = Math.PI * minR * minR * 0.45;
    const maxArea = Math.PI * maxR * maxR * 1.5;

    // BFS queue preallocated
    const queue = new Int32Array(totalPixels);

    for (let p = 0; p < totalPixels; p++) {
      if (processedMask[p] === 0 || visited[p] === 1) continue;

      let qHead = 0;
      let qTail = 0;
      queue[qTail++] = p;
      visited[p] = 1;

      let minX = p % procW;
      let maxX = minX;
      let minY = Math.floor(p / procW);
      let maxY = minY;
      let area = 0;
      let perimeter = 0;

      while (qHead < qTail) {
        const curr = queue[qHead++];
        area++;

        const cx = curr % procW;
        const cy = Math.floor(curr / procW);

        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        // Check 4-connected neighbors
        let isPerimeter = false;

        // Up
        if (cy > 0) {
          const up = curr - procW;
          if (processedMask[up] === 1) {
            if (visited[up] === 0) {
              visited[up] = 1;
              queue[qTail++] = up;
            }
          } else {
            isPerimeter = true;
          }
        } else isPerimeter = true;

        // Down
        if (cy < procH - 1) {
          const down = curr + procW;
          if (processedMask[down] === 1) {
            if (visited[down] === 0) {
              visited[down] = 1;
              queue[qTail++] = down;
            }
          } else {
            isPerimeter = true;
          }
        } else isPerimeter = true;

        // Left
        if (cx > 0) {
          const left = curr - 1;
          if (processedMask[left] === 1) {
            if (visited[left] === 0) {
              visited[left] = 1;
              queue[qTail++] = left;
            }
          } else {
            isPerimeter = true;
          }
        } else isPerimeter = true;

        // Right
        if (cx < procW - 1) {
          const right = curr + 1;
          if (processedMask[right] === 1) {
            if (visited[right] === 0) {
              visited[right] = 1;
              queue[qTail++] = right;
            }
          } else {
            isPerimeter = true;
          }
        } else isPerimeter = true;

        if (isPerimeter) perimeter++;
      }

      // Filter by Area
      if (area < minArea || area > maxArea) continue;

      const bw = maxX - minX + 1;
      const bh = maxY - minY + 1;
      const aspect = bw / bh;

      // Citruses are spherical/ellipsoid, not extremely elongated
      if (aspect < 0.45 || aspect > 2.2) continue;

      // Circularity: 4 * PI * Area / (Perimeter^2)
      const circularity = perimeter > 0 ? (4 * Math.PI * area) / (perimeter * perimeter) : 0;
      if (circularity < params.minCircularity) continue;

      // Margin padding of 5% around bounding box to enclose the whole fruit
      const padX = bw * 0.05;
      const padY = bh * 0.05;
      const finalMinX = Math.max(0, minX - padX);
      const finalMaxX = Math.min(procW, maxX + padX);
      const finalMinY = Math.max(0, minY - padY);
      const finalMaxY = Math.min(procH, maxY + padY);

      // Normalized coordinates [0, 1]
      const normX = finalMinX / procW;
      const normY = finalMinY / procH;
      const normW = (finalMaxX - finalMinX) / procW;
      const normH = (finalMaxY - finalMinY) / procH;

      // Estimate confidence based on circularity and fill ratio
      const fillRatio = area / (bw * bh);
      const conf = Math.min(0.99, Math.max(0.60, 0.5 * circularity + 0.5 * fillRatio));

      boxes.push({
        id: `col_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        x: normX,
        y: normY,
        width: normW,
        height: normH,
        classId: 0,
        className: 'Cítrico (Color)',
        confidence: Number(conf.toFixed(2)),
        source: 'color',
        circularity: Number(circularity.toFixed(2)),
        colorHex: '#f59e0b',
      });
    }

    // Optional visual mask canvas for calibration UI
    let maskCanvas: HTMLCanvasElement | undefined;
    if (generateMask) {
      maskCanvas = document.createElement('canvas');
      maskCanvas.width = procW;
      maskCanvas.height = procH;
      const maskCtx = maskCanvas.getContext('2d')!;
      const maskImgData = maskCtx.createImageData(procW, procH);
      const mData = maskImgData.data;

      for (let p = 0; p < totalPixels; p++) {
        const idx = p * 4;
        if (processedMask[p] === 1) {
          mData[idx] = 245;     // Amber R
          mData[idx + 1] = 158; // Amber G
          mData[idx + 2] = 11;  // Amber B
          mData[idx + 3] = 200; // Semi-transparent overlay
        } else {
          mData[idx] = 0;
          mData[idx + 1] = 0;
          mData[idx + 2] = 0;
          mData[idx + 3] = 0;
        }
      }
      maskCtx.putImageData(maskImgData, 0, 0);
    }

    const processTimeMs = Math.round(performance.now() - startTime);

    return {
      boxes,
      processTimeMs,
      maskCanvas,
    };
  }

  /**
   * Fast Morphological Opening (Erosion -> Dilation) using 3x3 cross kernel
   */
  private morphologyOpening(mask: Uint8Array, w: number, h: number): Uint8Array {
    const eroded = new Uint8Array(mask.length);
    const dilated = new Uint8Array(mask.length);

    // Erosion
    for (let y = 1; y < h - 1; y++) {
      const row = y * w;
      for (let x = 1; x < w - 1; x++) {
        const p = row + x;
        if (
          mask[p] === 1 &&
          mask[p - 1] === 1 &&
          mask[p + 1] === 1 &&
          mask[p - w] === 1 &&
          mask[p + w] === 1
        ) {
          eroded[p] = 1;
        }
      }
    }

    // Dilation
    for (let y = 1; y < h - 1; y++) {
      const row = y * w;
      for (let x = 1; x < w - 1; x++) {
        const p = row + x;
        if (eroded[p] === 1) {
          dilated[p] = 1;
          dilated[p - 1] = 1;
          dilated[p + 1] = 1;
          dilated[p - w] = 1;
          dilated[p + w] = 1;
        }
      }
    }

    return dilated;
  }
}

export const colorDetector = new FastAdaptiveColorDetector();
