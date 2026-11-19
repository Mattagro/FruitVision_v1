/**
 * Estado del almacenamiento del navegador (IndexedDB + cachés) y persistencia.
 * Las fotos se guardan como data URL en IndexedDB: con cientos de capturas el cupo
 * del navegador puede agotarse, y el navegador puede además desalojar los datos
 * si el almacenamiento no es "persistente".
 */
export interface StorageStatus {
  supported: boolean;
  usageBytes: number;
  quotaBytes: number;
  percent: number;                 // 0-100
  level: 'ok' | 'warning' | 'critical';
  persisted: boolean | null;       // null = API no disponible
}

export const STORAGE_WARN_PERCENT = 70;
export const STORAGE_CRITICAL_PERCENT = 90;

export async function getStorageStatus(): Promise<StorageStatus> {
  const empty: StorageStatus = {
    supported: false, usageBytes: 0, quotaBytes: 0, percent: 0, level: 'ok', persisted: null,
  };
  try {
    if (!navigator.storage?.estimate) return empty;
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    const percent = quota > 0 ? (usage / quota) * 100 : 0;
    let persisted: boolean | null = null;
    try {
      persisted = navigator.storage.persisted ? await navigator.storage.persisted() : null;
    } catch { /* sin información */ }
    return {
      supported: true,
      usageBytes: usage,
      quotaBytes: quota,
      percent,
      level: percent >= STORAGE_CRITICAL_PERCENT ? 'critical' : percent >= STORAGE_WARN_PERCENT ? 'warning' : 'ok',
      persisted,
    };
  } catch {
    return empty;
  }
}

/** Pide al navegador que no desaloje los datos de la app. Puede ser rechazado: no es error. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    return navigator.storage?.persist ? await navigator.storage.persist() : false;
  } catch {
    return false;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}
