export type MediaAssetId = string;

export interface StoredMediaAsset {
  id: MediaAssetId;
  name: string;
  type: string;
  size: number;
  updatedAt: number;
  blob: Blob;
}

const DB_NAME = 'monolith_six_media_vault';
const DB_VERSION = 1;
const STORE_NAME = 'assets';

export const MAX_VIDEO_BYTES = 260 * 1024 * 1024; // 260 MB
export const MAX_LOGO_BYTES = 10 * 1024 * 1024; // 10 MB

function openVaultDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open media storage'));
  });
}

export async function saveMediaAsset(asset: StoredMediaAsset): Promise<void> {
  const db = await openVaultDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(asset);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Failed to save media asset'));
    };
  });
}

export async function getMediaAsset(id: MediaAssetId): Promise<StoredMediaAsset | null> {
  const db = await openVaultDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => {
      db.close();
      resolve((request.result as StoredMediaAsset | undefined) ?? null);
    };
    request.onerror = () => {
      db.close();
      reject(request.error ?? new Error('Failed to load media asset'));
    };
  });
}

export async function getAllMediaAssets(): Promise<StoredMediaAsset[]> {
  const db = await openVaultDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      db.close();
      resolve((request.result as StoredMediaAsset[]) ?? []);
    };
    request.onerror = () => {
      db.close();
      reject(request.error ?? new Error('Failed to load media assets'));
    };
  });
}

export async function deleteMediaAsset(id: MediaAssetId): Promise<void> {
  const db = await openVaultDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Failed to delete media asset'));
    };
  });
}

export async function clearAllMediaAssets(): Promise<void> {
  const db = await openVaultDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('Failed to clear media assets'));
    };
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
