import JSZip from 'jszip';
import { CaptureRecord, BoundingBox } from '../types/citrus';

// Detector de clase única. La variedad/especie va como metadato, no como clase.
const CITRUS_CLASS = 'citrus';

/**
 * Convert base64 DataURL to ArrayBuffer or Blob
 */
function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generate YOLOv8/11 compatible dataset ZIP
 */
export async function exportYoloDatasetZip(
  captures: CaptureRecord[],
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const zip = new JSZip();

  const imgTrain = zip.folder('images/train')!;
  const imgVal = zip.folder('images/val')!;
  const lblTrain = zip.folder('labels/train')!;
  const lblVal = zip.folder('labels/val')!;

  // Una sola clase: 'citrus'. La variedad/especie (naranja, limón, mandarina...)
  // es metadato de la captura, no una clase del detector.
  const classMap = new Map<string, number>([[CITRUS_CLASS, 0]]);

  // Shuffle or split 80/20 train/val
  const total = captures.length;
  for (let i = 0; i < total; i++) {
    const item = captures[i];
    const isVal = total >= 5 ? i % 5 === 0 : false;
    const targetImgFolder = isVal ? imgVal : imgTrain;
    const targetLblFolder = isVal ? lblVal : lblTrain;

    const fileNameBase = `citrus_${item.metadata.cuartel || 'cx'}_h${item.metadata.hilera || '0'}_a${item.metadata.arbol || '0'}_${item.id.slice(-6)}`;
    const imgData = dataUrlToUint8Array(item.imageDataUrl);
    targetImgFolder.file(`${fileNameBase}.jpg`, imgData);

    // Generate YOLO format annotations: class_id center_x center_y width height (normalized)
    const labelLines: string[] = [];
    for (const box of item.boxes) {
      const clsId = 0; // clase única
      const cx = Math.min(1, Math.max(0, box.x + box.width / 2));
      const cy = Math.min(1, Math.max(0, box.y + box.height / 2));
      const w = Math.min(1, Math.max(0.001, box.width));
      const h = Math.min(1, Math.max(0.001, box.height));

      labelLines.push(`${clsId} ${cx.toFixed(6)} ${cy.toFixed(6)} ${w.toFixed(6)} ${h.toFixed(6)}`);
    }

    targetLblFolder.file(`${fileNameBase}.txt`, labelLines.join('\n'));

    if (onProgress) {
      onProgress(Math.round(((i + 1) / total) * 60));
    }
  }

  // Generate data.yaml
  const classNamesYaml = Array.from(classMap.entries())
    .map(([name, id]) => `  ${id}: '${name}'`)
    .join('\n');

  const dataYamlContent = `# YOLO Dataset Configuration for Citrus Detection
# Exportado desde Conteo de Cítricos
path: .
train: images/train
val: images/val
test: # optional

names:
${classNamesYaml}
`;

  zip.file('data.yaml', dataYamlContent);

  // Generate Colab Python training snippet
  const pythonScript = `# Script de entrenamiento YOLOv8 en Google Colab con GPU
# 1. Descomprime este archivo en Google Drive o sube a Colab:
#    !unzip dataset_citricos.zip -d /content/dataset

# 2. Instala ultralytics:
#    !pip install ultralytics

from ultralytics import YOLO

# Cargar modelo base preentrenado (yolov8n.pt o yolov11n.pt)
model = YOLO('yolov8n.pt')

# Entrenar en GPU
results = model.train(
    data='/content/dataset/data.yaml',
    epochs=50,
    imgsz=640,
    batch=16,
    device=0
)

# Exportar a TensorFlow.js para usar en la App web offline:
# model.export(format='tfjs')
print("Entrenamiento completado exitosamente.")
`;
  zip.file('train_colab.py', pythonScript);

  // Generate and return Blob
  const blob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
    if (onProgress) {
      onProgress(60 + Math.round(metadata.percent * 0.4));
    }
  });

  return blob;
}

/**
 * Generate CSV file of all field captures and yield estimates
 */
export function exportCapturesCsv(captures: CaptureRecord[]): string {
  const headers = [
    'ID',
    'Fecha',
    'Predio',
    'Cuartel',
    'Hilera',
    'Árbol',
    'Cara',
    'Variedad',
    'Etapa',
    'Latitud',
    'Longitud',
    'Conteo_Visible',
    'Factor_Follaje',
    'Frutas_Proyectadas_Arbol',
    'Peso_Medio_Fruto_g',
    'Kg_Estimados_Arbol',
    'Densidad_Arboles_ha',
    'Ton_Estimadas_ha',
    'Notas',
  ];

  const rows = captures.map(c => {
    const m = c.metadata;
    const dateStr = new Date(m.timestamp).toISOString();
    const visibleCount = c.boxes.length;
    const projectedFruits = Math.round(visibleCount * m.foliageCalibration);
    const kgPerTree = Number(((projectedFruits * m.fruitWeightGram) / 1000).toFixed(2));
    const tonPerHa = Number(((kgPerTree * m.treeDensityHa) / 1000).toFixed(2));

    return [
      `"${c.id}"`,
      `"${dateStr}"`,
      `"${m.predio.replace(/"/g, '""')}"`,
      `"${m.cuartel.replace(/"/g, '""')}"`,
      `"${m.hilera}"`,
      `"${m.arbol}"`,
      `"${m.cara}"`,
      `"${m.variedad}"`,
      `"${m.etapa}"`,
      m.gps?.latitude ?? '',
      m.gps?.longitude ?? '',
      visibleCount,
      m.foliageCalibration,
      projectedFruits,
      m.fruitWeightGram,
      kgPerTree,
      m.treeDensityHa,
      tonPerHa,
      `"${(m.notes || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Trigger browser file download
 */
export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import images or a full YOLO dataset ZIP into CaptureRecords
 */
export async function importDatasetOrImages(
  files: FileList | File[]
): Promise<CaptureRecord[]> {
  const fileArray = Array.from(files);
  const results: CaptureRecord[] = [];

  const zipFile = fileArray.find(f => f.name.toLowerCase().endsWith('.zip'));
  if (zipFile) {
    const zip = await JSZip.loadAsync(zipFile);
    
    // Find all image files in the zip
    const imageEntries = Object.entries(zip.files).filter(([path, entry]) => {
      if (entry.dir) return false;
      const lower = path.toLowerCase();
      return lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp');
    });

    for (const [imgPath, imgEntry] of imageEntries) {
      const imgBlob = await imgEntry.async('blob');
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(imgBlob);
      });

      // Match with label txt file if present
      const fileNameWithExt = imgPath.split('/').pop() || '';
      const baseName = fileNameWithExt.substring(0, fileNameWithExt.lastIndexOf('.'));
      
      const labelEntry = Object.entries(zip.files).find(([p, e]) => {
        if (e.dir) return false;
        const pLower = p.toLowerCase();
        return pLower.endsWith(`${baseName.toLowerCase()}.txt`);
      });

      const boxes: BoundingBox[] = [];
      if (labelEntry) {
        const labelText = await labelEntry[1].async('text');
        const lines = labelText.trim().split('\n');
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 5) {
            const classId = parseInt(parts[0], 10);
            const cx = parseFloat(parts[1]);
            const cy = parseFloat(parts[2]);
            const w = parseFloat(parts[3]);
            const h = parseFloat(parts[4]);

            boxes.push({
              id: `box_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              x: Math.max(0, cx - w / 2),
              y: Math.max(0, cy - h / 2),
              width: w,
              height: h,
              classId: 0,
              className: CITRUS_CLASS,
              confidence: 1.0,
              source: 'yolo',
            });
          }
        }
      }

      const id = `import_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      results.push({
        id,
        imageDataUrl: dataUrl,
        width: 960,
        height: 720,
        boxes,
        count: boxes.length,
        metadata: {
          id,
          timestamp: Date.now(),
          predio: 'Fundo El Naranjal',
          cuartel: 'Dataset YOLO',
          hilera: '1',
          arbol: '1',
          cara: 'Total',
          variedad: 'Cítrico General',
          etapa: 'Maduro',
          foliageCalibration: 1.35,
          fruitWeightGram: 180,
          treeDensityHa: 416,
          notes: `Importado de ${fileNameWithExt} (${boxes.length} anotaciones)`,
        },
      });
    }

    return results;
  }

  // Otherwise, individual image files
  for (const f of fileArray) {
    if (!f.type.startsWith('image/')) continue;
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(f);
    });

    const id = `capture_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    results.push({
      id,
      imageDataUrl: dataUrl,
      width: 960,
      height: 720,
      boxes: [],
      count: 0,
      metadata: {
        id,
        timestamp: f.lastModified || Date.now(),
        predio: 'Fundo El Naranjal',
        cuartel: 'Campo',
        hilera: '1',
        arbol: '1',
        cara: 'Total',
        variedad: 'Cítrico General',
        etapa: 'Maduro',
        foliageCalibration: 1.35,
        fruitWeightGram: 180,
        treeDensityHa: 416,
        notes: `Foto importada: ${f.name}`,
      },
    });
  }

  return results;
}
