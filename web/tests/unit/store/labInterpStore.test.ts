/**
 * 健澜科技 jlmedaios - 检验解读 store 单测（M3-E）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useLabInterpStore } from '@/store/labInterpStore';

vi.mock('@/services/api/labInterpret', () => ({
  fetchLabInterpQueue: vi.fn(),
  generateLabInterp: vi.fn(),
  signLabInterp: vi.fn(),
  rejectLabInterp: vi.fn(),
}));

import {
  fetchLabInterpQueue,
  generateLabInterp,
  signLabInterp,
  rejectLabInterp,
} from '@/services/api/labInterpret';

const draft = {
  id: 'r1', visitId: 'v1', patientId: 'p1', department: '心血管内科',
  itemCount: 5, abnormalCount: 1, criticalCount: 1,
  summary: '共5项，异常1项，危急1项。危急项：肌钙蛋白I(0.15ng/mL)。',
  abnormalItems: [], criticalItems: [], engineVersion: 'lab-rule-1.0',
  status: 'pending_review' as const, generatedAt: new Date().toISOString(),
  reviewedBy: null, reviewedAt: null, rejectReason: null,
};

beforeEach(() => {
  useLabInterpStore.setState({ items: [], loading: false, error: null });
  vi.mocked(fetchLabInterpQueue).mockResolvedValue({
    items: [{ id: 'r1', visitId: 'v1', visitNo: 'V001', patientName: '张**', department: '心血管内科', abnormalCount: 1, criticalCount: 1, status: 'pending_review', updatedAt: new Date().toISOString() }],
  });
  vi.mocked(generateLabInterp).mockResolvedValue(draft);
  vi.mocked(signLabInterp).mockResolvedValue({ ...draft, status: 'signed' });
  vi.mocked(rejectLabInterp).mockResolvedValue({ ...draft, status: 'rejected' });
});

describe('labInterpStore', () => {
  it('loadQueue 拉取队列', async () => {
    await useLabInterpStore.getState().loadQueue();
    expect(useLabInterpStore.getState().items).toHaveLength(1);
  });

  it('generate 生成草稿', async () => {
    const r = await useLabInterpStore.getState().generate('v1');
    expect(r.criticalCount).toBe(1);
    expect(generateLabInterp).toHaveBeenCalledWith('v1');
  });

  it('断库失败写入 error 且不吞', async () => {
    vi.mocked(fetchLabInterpQueue).mockRejectedValueOnce(new Error('Connection refused'));
    await expect(useLabInterpStore.getState().loadQueue()).rejects.toThrow('Connection refused');
    expect(useLabInterpStore.getState().error).toBe('Connection refused');
  });
});
