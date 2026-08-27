/**
 * VEYRA — Media Storage Service (IndexedDB)
 * Persists actual media files and blobs locally in the browser's IndexedDB.
 * Isolates binary storage from localStorage to avoid quota overflow and memory leaks.
 */

const DB_NAME = 'veyra_media_db_v1';
const DB_VERSION = 1;
const STORE_NAME = 'media_files';

let dbInstance: IDBDatabase | null = null;

/**
 * Open or initialize the IndexedDB instance
 */
export function getMediaDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      
      // Handle closing/error
      dbInstance.onversionchange = () => {
        dbInstance?.close();
        dbInstance = null;
      };
      
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('Failed to open IndexedDB:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

/**
 * Save a media Blob or File into IndexedDB under the project's ID
 */
export async function saveMedia(projectId: string, fileOrBlob: Blob | File): Promise<void> {
  const db = await getMediaDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(fileOrBlob, projectId);

      req.onsuccess = () => {
        resolve();
      };

      req.onerror = (e) => {
        console.error(`Failed to save media for project ${projectId}:`, (e.target as IDBRequest).error);
        reject((e.target as IDBRequest).error);
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Retrieve a media Blob from IndexedDB by projectId
 */
export async function getMedia(projectId: string): Promise<Blob | null> {
  const db = await getMediaDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(projectId);

      req.onsuccess = () => {
        const result = req.result;
        if (result && (result instanceof Blob || result instanceof File)) {
          resolve(result);
        } else {
          resolve(null);
        }
      };

      req.onerror = (e) => {
        console.error(`Failed to fetch media for project ${projectId}:`, (e.target as IDBRequest).error);
        reject((e.target as IDBRequest).error);
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Check whether media exists for a given projectId
 */
export async function hasMedia(projectId: string): Promise<boolean> {
  try {
    const media = await getMedia(projectId);
    return media !== null;
  } catch {
    return false;
  }
}

/**
 * Delete a media file from IndexedDB by projectId
 */
export async function deleteMedia(projectId: string): Promise<boolean> {
  const db = await getMediaDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(projectId);

      req.onsuccess = () => {
        resolve(true);
      };

      req.onerror = (e) => {
        console.error(`Failed to delete media for project ${projectId}:`, (e.target as IDBRequest).error);
        reject((e.target as IDBRequest).error);
      };
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Replace media for a project (clears and writes new file/blob)
 */
export async function replaceMedia(projectId: string, newFileOrBlob: Blob | File): Promise<void> {
  await saveMedia(projectId, newFileOrBlob);
}
