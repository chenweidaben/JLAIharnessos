/**
 * 健澜科技 jlmedaios - 危急值 store 单测（M3-F）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCriticalStore } from '@/store/criticalStore';

vi.mock('@/services/api/criticalValue', () => ({
  fetchCriticalAlerts: vi.fn(),
  scanCritical: vi.fn(),
  ackCritical: vi.fn(),
  resolveCritical: vi.fn(),
}));

import {
  fetchCriticalAlerts,
  scanCritical,
  ackCritical,
  resolveCritical,
} from '@/services/api/criticalValue';

beforeEach(() => {
  useCriticalStore.setState({ items: [], loading: false, error: null });
  vi.mocked(fetchCriticalAlerts).mockResolvedValue({
    items: [{
      id: 'a1', visitId: 'v1', visitNo: 'V001', patientName: '张**', department: '急诊科',
      itemName: '肌钙蛋白I', value: '0.15', unit: 'ng/mL', flag: 'HH',
      status: 'raised', raisedAt: new Date().toISOString(),
    }],
  });
  vi.mocked(scanCritical).mockResolvedValue({ raised: 3 });
  vi.mocked(ackCritical).mockResolvedValue({});
  vi.mocked(resolveCritical).mockResolvedValue({});
});

describe('criticalStore', () => {
  it('loadQueue 拉取队列', async () => {
    await useCriticalStore.getState().loadQueue();
    expect(useCriticalStore.getState().items).toHaveLength(1);
  });

  it('scan 返回新上报数', async () => {
    const n = await useCriticalStore.getState().scan();
    expect(n).toBe(3);
  });

  it('断库失败写入 error 且不吞', async () => {
    vi.mocked(fetchCriticalAlerts).mockRejectedValueOnce(new Error('Connection refused'));
    await expect(useCriticalStore.getState().loadQueue()).rejects.toThrow('Connection refused');
    expect(useCriticalStore.getState().error).toBe('Connection refused');
  });
});
