/**
 * Cola de operaciones offline usando IndexedDB
 * Guarda operaciones pendientes para sincronizar cuando vuelva la conexión
 */

const DB_NAME = "marmaq-offline";
const DB_VERSION = 1;
const STORE_QUEUE = "pending-operations";
const STORE_CACHE = "cached-data";

export interface PendingOperation {
  id: string;
  type: "CREATE_ORDEN" | "UPDATE_ORDEN" | "UPLOAD_EVIDENCIA" | "UPLOAD_FIRMA" | "CREATE_NOTA";
  data: Record<string, unknown>;
  timestamp: number;
  retries: number;
  lastError?: string;
}

export interface CachedData {
  key: string;
  data: unknown;
  timestamp: number;
  expiresAt: number;
}

class OfflineQueue {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof window === "undefined") {
        resolve();
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error("Error opening IndexedDB:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store for pending operations
        if (!db.objectStoreNames.contains(STORE_QUEUE)) {
          const queueStore = db.createObjectStore(STORE_QUEUE, { keyPath: "id" });
          queueStore.createIndex("timestamp", "timestamp", { unique: false });
          queueStore.createIndex("type", "type", { unique: false });
        }

        // Store for cached data
        if (!db.objectStoreNames.contains(STORE_CACHE)) {
          const cacheStore = db.createObjectStore(STORE_CACHE, { keyPath: "key" });
          cacheStore.createIndex("expiresAt", "expiresAt", { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  // ============ QUEUE OPERATIONS ============

  async addToQueue(operation: Omit<PendingOperation, "id" | "timestamp" | "retries">): Promise<string> {
    await this.init();
    if (!this.db) throw new Error("IndexedDB not available");

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const pending: PendingOperation = {
      ...operation,
      id,
      timestamp: Date.now(),
      retries: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_QUEUE], "readwrite");
      const store = transaction.objectStore(STORE_QUEUE);
      const request = store.add(pending);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  async getQueuedOperations(): Promise<PendingOperation[]> {
    await this.init();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_QUEUE], "readonly");
      const store = transaction.objectStore(STORE_QUEUE);
      const index = store.index("timestamp");
      const request = index.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removeFromQueue(id: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_QUEUE], "readwrite");
      const store = transaction.objectStore(STORE_QUEUE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateOperation(id: string, updates: Partial<PendingOperation>): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_QUEUE], "readwrite");
      const store = transaction.objectStore(STORE_QUEUE);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const existing = getRequest.result;
        if (!existing) {
          resolve();
          return;
        }

        const updated = { ...existing, ...updates };
        const putRequest = store.put(updated);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async getQueueCount(): Promise<number> {
    await this.init();
    if (!this.db) return 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_QUEUE], "readonly");
      const store = transaction.objectStore(STORE_QUEUE);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ============ CACHE OPERATIONS ============

  async cacheData(key: string, data: unknown, ttlSeconds: number = 3600): Promise<void> {
    await this.init();
    if (!this.db) return;

    const cached: CachedData = {
      key,
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlSeconds * 1000,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_CACHE], "readwrite");
      const store = transaction.objectStore(STORE_CACHE);
      const request = store.put(cached);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCachedData<T>(key: string): Promise<T | null> {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_CACHE], "readonly");
      const store = transaction.objectStore(STORE_CACHE);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result as CachedData | undefined;
        if (!result) {
          resolve(null);
          return;
        }

        // Check if expired
        if (result.expiresAt < Date.now()) {
          this.removeCachedData(key);
          resolve(null);
          return;
        }

        resolve(result.data as T);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async removeCachedData(key: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_CACHE], "readwrite");
      const store = transaction.objectStore(STORE_CACHE);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearExpiredCache(): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_CACHE], "readwrite");
      const store = transaction.objectStore(STORE_CACHE);
      const index = store.index("expiresAt");
      const range = IDBKeyRange.upperBound(Date.now());
      const request = index.openCursor(range);

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton instance
export const offlineQueue = new OfflineQueue();

// ============ SYNC SERVICE ============

export async function syncPendingOperations(): Promise<{
  synced: number;
  failed: number;
  errors: string[];
}> {
  const operations = await offlineQueue.getQueuedOperations();
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const op of operations) {
    try {
      let response: Response;

      switch (op.type) {
        case "CREATE_ORDEN":
          response = await fetch("/api/ordenes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(op.data),
          });
          break;

        case "UPDATE_ORDEN":
          response = await fetch(`/api/ordenes/${op.data.ordenId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(op.data),
          });
          break;

        case "UPLOAD_EVIDENCIA":
          const formData = new FormData();
          formData.append("tipo", op.data.tipo as string);
          if (op.data.blob) {
            formData.append("files", op.data.blob as Blob);
          }
          response = await fetch(`/api/ordenes/${op.data.ordenId}/evidencias`, {
            method: "POST",
            body: formData,
          });
          break;

        case "UPLOAD_FIRMA":
          const firmaData = new FormData();
          if (op.data.blob) {
            firmaData.append("firma", op.data.blob as Blob);
          }
          response = await fetch(`/api/ordenes/${op.data.ordenId}/firma`, {
            method: "POST",
            body: firmaData,
          });
          break;

        case "CREATE_NOTA":
          response = await fetch(`/api/ordenes/${op.data.ordenId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notasTecnico: op.data.nota }),
          });
          break;

        default:
          throw new Error(`Unknown operation type: ${op.type}`);
      }

      if (response.ok) {
        await offlineQueue.removeFromQueue(op.id);
        synced++;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      failed++;
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      errors.push(`${op.type}: ${errorMsg}`);

      // Update retry count
      await offlineQueue.updateOperation(op.id, {
        retries: op.retries + 1,
        lastError: errorMsg,
      });
    }
  }

  return { synced, failed, errors };
}

// Auto-sync when coming back online
if (typeof window !== "undefined") {
  window.addEventListener("app:online", async () => {
    console.log("Connection restored, syncing pending operations...");
    const result = await syncPendingOperations();
    console.log(`Sync complete: ${result.synced} synced, ${result.failed} failed`);

    if (result.synced > 0) {
      window.dispatchEvent(new CustomEvent("app:synced", { detail: result }));
    }
  });
}
