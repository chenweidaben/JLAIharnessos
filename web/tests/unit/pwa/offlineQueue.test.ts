/**
 * 健澜科技 jlmedaios - 移动护理离线队列单测（M16-A / M16A_TEST）
 * 用内存存储注入 createOfflineQueue，确定性验证 enqueue/flush/成功出队/失败保留/冲突人工确认。
 * 医疗安全：医嘱执行类（administer）远端同 slot 已有记录 → 标记冲突、不删除、不自动覆盖。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createOfflineQueue,
  MemoryQueueStore,
  type OfflineQueue,
  type QueuedItem,
} from '@/pwa/offlineQueue';

let store: MemoryQueueStore;
let q: OfflineQueue;

beforeEach(() => {
  store = new MemoryQueueStore();
  q = createOfflineQueue(store);
});

const baseItem = {
  kind: 'write' as const,
  url: '/m/vitals',
  method: 'POST',
  body: { visitId: 'v1' },
};

describe('M16A_TEST offlineQueue', () => {
  it('enqueue 后可列出，pending 计数正确', async () => {
    await q.enqueue(baseItem);
    await q.enqueue(baseItem);
    const items = await q.pending();
    expect(items).toHaveLength(2);
    expect(items[0].conflicted).toBe(false);
  });

  it('flush 成功后出队删除', async () => {
    await q.enqueue(baseItem);
    const r = await q.flush(async () => ({ ok: true }));
    expect(r.sent).toBe(1);
    expect(await q.pending()).toHaveLength(0);
  });

  it('flush 网络失败保留队列', async () => {
    await q.enqueue(baseItem);
    const r = await q.flush(async () => {
      throw new Error('ECONNREFUSED');
    });
    expect(r.failed).toBe(1);
    expect(await q.pending()).toHaveLength(1);
  });

  it('给药类远端已有记录 → 冲突标记、不删除、不自动覆盖', async () => {
    await q.enqueue({ ...baseItem, kind: 'administer', url: '/m/orders/o1/administer', orderId: 'o1', slot: '2026-10-08T08:00' });
    const r = await q.flush(async () => ({ ok: true, remoteHasRecord: true }));
    expect(r.conflicted).toBe(1);
    expect(r.sent).toBe(0);
    const items = (await q.pending()) as QueuedItem[];
    expect(items).toHaveLength(1);
    expect(items[0].conflicted).toBe(true);
  });

  it('普通写即使远端有记录也不视为冲突，成功即出队', async () => {
    await q.enqueue({ ...baseItem, kind: 'write' });
    const r = await q.flush(async () => ({ ok: true, remoteHasRecord: true }));
    expect(r.conflicted).toBe(0);
    expect(r.sent).toBe(1);
  });
});
