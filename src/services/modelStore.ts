import { dbService } from './db';

/**
 * Persistencia del modelo YOLO en el teléfono (IndexedDB, mismo almacén que las capturas).
 * Así el modelo se carga solo al abrir la app, también sin internet, sin volver a subir el ZIP.
 * Se guardan los archivos ya normalizados (model.json, fragmentos .bin y labels.json) como
 * ArrayBuffer, que es lo más compatible entre navegadores (Safari/iOS incluido).
 */
const KEY_MODEL = 'yolo_model_files_v1';
const KEY_THRESHOLDS = 'yolo_thresholds_v1';

interface StoredFile { name: string; type: string; data: ArrayBuffer }
interface StoredModel { savedAt: number; files: StoredFile[] }

export interface StoredThresholds { conf: number; iou: number; tileGrid: 1 | 2; letterbox: boolean }

export async function saveModelFiles(files: File[]): Promise<void> {
  const stored: StoredFile[] = [];
  for (const f of files) {
    stored.push({ name: f.name, type: f.type, data: await f.arrayBuffer() });
  }
  const payload: StoredModel = { savedAt: Date.now(), files: stored };
  await dbService.saveSetting(KEY_MODEL, payload);
}

export async function loadModelFiles(): Promise<File[] | null> {
  const stored = await dbService.getSetting<StoredModel | null>(KEY_MODEL, null);
  if (!stored || !Array.isArray(stored.files) || stored.files.length === 0) return null;
  return stored.files.map(f => new File([f.data], f.name, { type: f.type }));
}

export async function deleteModelFiles(): Promise<void> {
  await dbService.saveSetting(KEY_MODEL, null);
}

export async function saveThresholds(t: StoredThresholds): Promise<void> {
  await dbService.saveSetting(KEY_THRESHOLDS, t);
}

export async function loadThresholds(): Promise<StoredThresholds | null> {
  const t = await dbService.getSetting<StoredThresholds | null>(KEY_THRESHOLDS, null);
  if (!t || typeof t.conf !== 'number' || typeof t.iou !== 'number') return null;
  return { conf: t.conf, iou: t.iou, tileGrid: t.tileGrid === 2 ? 2 : 1, letterbox: t.letterbox === true };
}
