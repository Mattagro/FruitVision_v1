import { CaptureRecord, CaptureMetadata, HsvFilterParams } from '../types/citrus';

const DB_NAME = 'CitrusVisionDB';
const DB_VERSION = 1;
const STORE_CAPTURES = 'captures';
const STORE_SETTINGS = 'settings';

export const DEFAULT_HSV_ORANGE: HsvFilterParams = {
  hMin: 8,
  hMax: 42,
  sMin: 35,
  sMax: 100,
  vMin: 40,
  vMax: 100,
  minRadius: 8,
  maxRadius: 80,
  minCircularity: 0.52,
  adaptiveLuminance: true,
  morphologyIterations: 1,
};

export const DEFAULT_HSV_LEMON: HsvFilterParams = {
  hMin: 40,
  hMax: 78,
  sMin: 30,
  sMax: 100,
  vMin: 45,
  vMax: 100,
  minRadius: 8,
  maxRadius: 80,
  minCircularity: 0.55,
  adaptiveLuminance: true,
  morphologyIterations: 1,
};

export const DEFAULT_ORCHARD_METADATA: Omit<CaptureMetadata, 'id' | 'timestamp'> = {
  predio: 'Fundo El Naranjal',
  cuartel: 'Cuartel 4B',
  hilera: '12',
  arbol: '1',
  cara: 'Total',
  variedad: 'Naranja Valencia',
  etapa: 'Maduro',
  foliageCalibration: 1.35, // 35% de fruta no visible directamente
  fruitWeightGram: 180,     // 180g por fruto
  treeDensityHa: 416,       // 6m x 4m = ~416 árboles/ha
  notes: '',
};

class CitrusDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_CAPTURES)) {
          const store = db.createObjectStore(STORE_CAPTURES, { keyPath: 'id' });
          store.createIndex('timestamp', 'metadata.timestamp', { unique: false });
          store.createIndex('cuartel', 'metadata.cuartel', { unique: false });
          store.createIndex('variedad', 'metadata.variedad', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  async getAllCaptures(): Promise<CaptureRecord[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CAPTURES, 'readonly');
      const store = tx.objectStore(STORE_CAPTURES);
      const req = store.getAll();
      req.onsuccess = () => {
        const records = (req.result || []) as CaptureRecord[];
        // Sort descending by timestamp
        records.sort((a, b) => b.metadata.timestamp - a.metadata.timestamp);
        resolve(records);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async saveCapture(capture: CaptureRecord): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CAPTURES, 'readwrite');
      const store = tx.objectStore(STORE_CAPTURES);
      const req = store.put(capture);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async deleteCapture(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CAPTURES, 'readwrite');
      const store = tx.objectStore(STORE_CAPTURES);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async clearAllCaptures(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CAPTURES, 'readwrite');
      const store = tx.objectStore(STORE_CAPTURES);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SETTINGS, 'readonly');
      const store = tx.objectStore(STORE_SETTINGS);
      const req = store.get(key);
      req.onsuccess = () => {
        resolve(req.result !== undefined ? req.result : defaultValue);
      };
      req.onerror = () => resolve(defaultValue);
    });
  }

  async saveSetting<T>(key: string, value: T): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SETTINGS, 'readwrite');
      const store = tx.objectStore(STORE_SETTINGS);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}

export const dbService = new CitrusDatabase();
