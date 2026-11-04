import JSZip from 'jszip';
import { CaptureRecord } from '../types/citrus';

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

  // Collect unique classes
  const classMap = new Map<string, number>();
  let classIndex = 0;

  captures.forEach(c => {
    c.boxes.forEach(b => {
      const name = b.className || 'citrus';
      if (!classMap.has(name)) {
        classMap.set(name, classIndex++);
      }
    });
  });

  if (classMap.size === 0) {
    classMap.set('citrus', 0);
  }

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
      const clsId = classMap.get(box.className) ?? 0;
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
