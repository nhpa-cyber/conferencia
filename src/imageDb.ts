/**
 * IndexedDB Database Service for LogiRoute Photo Evidence
 * Stores Base64 compressed image files safely without local storage limit restrictions.
 */

export interface PhotoRecord {
  id: string;             // Unique ID (e.g., photo_123)
  auditId: string;        // ID of the audit session
  itemCode: string;       // SKU Code or Asset ID
  itemName: string;       // SKU Description or Asset Name
  photoUrl: string;       // Base64 compressed JPEG string
  timestamp: string;      // ISO Date when captured
  conferenteId: string;   // Who took the photo
  driverId: string;       // Accountable driver ID
  driverName: string;     // Accountable driver name
  type: 'produto' | 'ativo' | 'refugo' | 'troca_reposicao'; // Product, Asset, Refugo, or Exchange/Replacement
}

const DB_NAME = 'logiroute_photos_db';
const DB_VERSION = 1;
const STORE_NAME = 'photos';

export class ImageDB {
  private static dbPromise: Promise<IDBDatabase> | null = null;

  private static getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('auditId', 'auditId', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        console.error('Failed to open photo database:', request.error);
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  /**
   * Save a new photo record
   */
  static async savePhoto(record: Omit<PhotoRecord, 'id' | 'timestamp'>): Promise<PhotoRecord> {
    const db = await this.getDB();
    const newRecord: PhotoRecord = {
      ...record,
      id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString()
    };

    // Save locally
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(newRecord);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Replicate to server asynchronously
    try {
      await fetch('/api/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo: newRecord })
      });
    } catch (e) {
      console.warn('Erro ao replicar foto para o servidor:', e);
    }

    return newRecord;
  }

  /**
   * Retrieve all photos for a specific audit, returning local results instantly
   * and syncing with the server in the background.
   */
  static async getPhotosByAudit(auditId: string): Promise<PhotoRecord[]> {
    // 1. Kick off server fetch in the background (DO NOT await it!)
    this.syncPhotosFromServer(auditId).catch((err) => {
      console.warn('Background sync of photos failed:', err);
    });

    // 2. Query and return local records from IndexedDB immediately
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('auditId');
      const request = index.getAll(auditId);

      request.onsuccess = () => {
        // Sort by timestamp newest first
        const results = (request.result as PhotoRecord[]).sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        resolve(results);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Background task to sync photos from the server into the local IndexedDB
   */
  private static async syncPhotosFromServer(auditId: string): Promise<void> {
    try {
      const res = await fetch(`/api/photos?auditId=${encodeURIComponent(auditId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.photos) && data.photos.length > 0) {
          const db = await this.getDB();
          await new Promise<void>((resolve) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            let count = 0;
            data.photos.forEach((photo: PhotoRecord) => {
              const req = store.put(photo);
              req.onsuccess = req.onerror = () => {
                count++;
                if (count === data.photos.length) resolve();
              };
            });
          });
        }
      }
    } catch (e) {
      console.warn('Erro ao sincronizar fotos do servidor para auditoria:', e);
    }
  }

  /**
   * Get all photo records in the system, returning local results instantly
   * and syncing with the server in the background.
   */
  static async getAllPhotos(): Promise<PhotoRecord[]> {
    // 1. Kick off server fetch in the background (DO NOT await it!)
    this.syncAllPhotosFromServer().catch((err) => {
      console.warn('Background sync of all photos failed:', err);
    });

    // 2. Query and return local records from IndexedDB immediately
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result as PhotoRecord[]);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Background task to sync all photos from the server into the local IndexedDB
   */
  private static async syncAllPhotosFromServer(): Promise<void> {
    try {
      const res = await fetch('/api/photos');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.photos) && data.photos.length > 0) {
          const db = await this.getDB();
          await new Promise<void>((resolve) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            let count = 0;
            data.photos.forEach((photo: PhotoRecord) => {
              const req = store.put(photo);
              req.onsuccess = req.onerror = () => {
                count++;
                if (count === data.photos.length) resolve();
              };
            });
          });
        }
      }
    } catch (e) {
      console.warn('Erro ao sincronizar todas as fotos do servidor:', e);
    }
  }

  /**
   * Delete a photo by ID
   */
  static async deletePhoto(id: string): Promise<void> {
    const db = await this.getDB();
    
    // Delete locally
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Delete on server
    try {
      await fetch(`/api/photos/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Erro ao deletar foto do servidor:', e);
    }
  }

  /**
   * Delete all photo records in the system (Wipe/Reset database)
   */
  static async clearAllPhotos(): Promise<void> {
    const db = await this.getDB();
    
    // Clear locally
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Clear on server
    try {
      await fetch('/api/photos/clear', { method: 'POST' });
    } catch (e) {
      console.warn('Erro ao limpar fotos do servidor:', e);
    }
  }

  /**
   * Prune old records older than X days (e.g., 30 days or 365 days / 12 months)
   */
  static async prunePhotos(daysRetention: number): Promise<{ prunedCount: number }> {
    const db = await this.getDB();
    const photos = await this.getAllPhotos();
    const cutoffMs = Date.now() - (daysRetention * 24 * 60 * 60 * 1000);
    
    let prunedCount = 0;
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    for (const photo of photos) {
      const photoTime = new Date(photo.timestamp).getTime();
      if (photoTime < cutoffMs) {
        store.delete(photo.id);
        prunedCount++;
      }
    }

    await new Promise<void>((resolve) => {
      transaction.oncomplete = () => {
        resolve();
      };
      transaction.onerror = () => {
        console.error('Error during photo pruning transaction:', transaction.error);
        resolve();
      };
    });

    // Prune on server
    try {
      const res = await fetch('/api/photos/prune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daysRetention })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.prunedCount !== undefined) {
          prunedCount = data.prunedCount;
        }
      }
    } catch (e) {
      console.warn('Erro ao podar fotos no servidor:', e);
    }

    return { prunedCount };
  }

  /**
   * Calculate database stats (count and estimated space in MB)
   */
  static async getDatabaseStats(): Promise<{ count: number; sizeMb: number }> {
    try {
      const photos = await this.getAllPhotos();
      let totalChars = 0;
      photos.forEach(p => {
        totalChars += (p.photoUrl || '').length;
      });
      
      // Estimated size in bytes (1 character in JS is approx 2 bytes, but let's base it on Base64 byte length)
      const estimatedBytes = totalChars * 0.75; 
      const sizeMb = Number((estimatedBytes / (1024 * 1024)).toFixed(2));
      
      return {
        count: photos.length,
        sizeMb
      };
    } catch (e) {
      return { count: 0, sizeMb: 0 };
    }
  }
}
