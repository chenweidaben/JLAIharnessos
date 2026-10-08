/**
 * 健澜科技 jlmedaios - 移动护理离线同步队列（M16-A）
 *
 * PWA + IndexedDB：弱网/断库时把床旁写操作（给药/体征/任务/记录/评估/交班签名）入队，
 * 恢复后重放。医疗安全：医嘱执行类（administer）若远端同 slot 已有记录 → 标记冲突，
 * 交人工确认，绝不自动覆盖/重复给药。
 *
 * 存储层为可注入接口：默认浏览器 IndexedDB；测试注入内存实现，确定性可单测，不依赖 fake-indexeddb。
 */
import { detectSyncConflict } from '@/utils/mobileNursing';

export type QueueOpKind = 'administer' | 'write';

export interface QueuedItem {
  id: string;
  kind: QueueOpKind;
  url: string;
  method: string;
  body: unknown;
  orderId?: string | null;
  slot?: string | null;
  /** 冲突标记：医嘱执行类远端已有记录时为 true，须人工确认。 */
  conflicted?: boolean;
  enqueuedAt: string;
}

/** 最小存储抽象（IndexedDB / 内存均可实现）。 */
export interface QueueStore {
  getAll(): Promise<QueuedItem[]>;
  put(item: QueuedItem): Promise<void>;
  remove(id: string): Promise<void>;
}

/* ----------------------------- 默认 IndexedDB 存储 ----------------------------- */
const DB_NAME = 'm16a-offline';
const STORE = 'queue';

function idbAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

class IdbQueueStore implements QueueStore {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private db(): Promise<IDBDatabase> {
    if (!this.dbPromise) this.dbPromise = openIdb();
    return this.dbPromise;
  }

  async getAll(): Promise<QueuedItem[]> {
    const db = await this.db();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve((req.result as QueuedItem[]) ?? []);
      req.onerror = () => reject(req.error);
    });
  }

  async put(item: QueuedItem): Promise<void> {
    const db = await this.db();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async remove(id: string): Promise<void> {
    const db = await this.db();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

/* ----------------------------- 内存存储（测试 / IDB 不可用降级） ----------------------------- */
export class MemoryQueueStore implements QueueStore {
  private map = new Map<string, QueuedItem>();
  async getAll(): Promise<QueuedItem[]> {
    return Array.from(this.map.values());
  }
  async put(item: QueuedItem): Promise<void> {
    this.map.set(item.id, item);
  }
  async remove(id: string): Promise<void> {
    this.map.delete(id);
  }
}

/* ----------------------------- 队列 ----------------------------- */
export type SendResult = { ok: boolean; remoteHasRecord?: boolean };
export type SendFn = (item: QueuedItem) => Promise<SendResult>;

export interface OfflineQueue {
  enqueue(item: Omit<QueuedItem, 'id' | 'enqueuedAt' | 'conflicted'>): Promise<QueuedItem>;
  pending(): Promise<QueuedItem[]>;
  flush(send: SendFn): Promise<{ sent: number; conflicted: number; failed: number }>;
  clear(): Promise<void>;
}

export function createOfflineQueue(store: QueueStore): OfflineQueue {
  let counter = 0;
  const nextId = () =>
    `q_${Date.now().toString(36)}_${(counter++).toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;

  return {
    async enqueue(item) {
      const full: QueuedItem = {
        ...item,
        id: nextId(),
        conflicted: false,
        enqueuedAt: new Date().toISOString(),
      };
      await store.put(full);
      return full;
    },
    async pending() {
      return store.getAll();
    },
    async flush(send) {
      const items = await store.getAll();
      let sent = 0;
      let conflicted = 0;
      let failed = 0;
      for (const item of items) {
        try {
          const res = await send(item);
          // 医嘱执行类冲突：远端同 slot 已有记录 → 标记冲突，人工确认，不删除、不覆盖。
          const conflict = detectSyncConflict({
            kind: item.kind,
            orderId: item.orderId,
            slot: item.slot,
            remoteHasRecord: !!res.remoteHasRecord,
          });
          if (conflict.conflict) {
            await store.put({ ...item, conflicted: true });
            conflicted += 1;
            continue;
          }
          if (res.ok) {
            await store.remove(item.id);
            sent += 1;
          } else {
            failed += 1;
          }
        } catch {
          // 网络错误：保留队列，下次 flush 重试。
          failed += 1;
        }
      }
      return { sent, conflicted, failed };
    },
    async clear() {
      const all = await store.getAll();
      await Promise.all(all.map((i) => store.remove(i.id)));
    },
  };
}

/** 浏览器默认单例：IndexedDB 可用则用之，否则降级内存（刷新后丢失，但不假成功）。 */
export const offlineQueue: OfflineQueue = createOfflineQueue(
  idbAvailable() ? new IdbQueueStore() : new MemoryQueueStore(),
);
