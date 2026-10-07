/**
 * 健澜科技 jlmedaios - 影像解读 store 单测（M12-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useImagingInterpretStore } from '@/store/imagingInterpretStore';

vi.mock('@/services/api/imagingInterpret', () => ({
  fetchImagingInterpQueue: vi.fn(),
  generateImagingInterp: vi.fn(),
  fetchImagingInterp: vi.fn(),
  signImagingInterp: vi.fn(),
  rejectImagingInterp: vi.fn(),
}));

import {
  fetchImagingInterpQueue,
  generateImagingInterp,
  fetchImagingInterp,
  signImagingInterp,
  rejectImagingInterp,
} from '@/services/api/imagingInterpret';

const draft = {
  id: 'ii1', reportId: 'rep1', visitId: 'v1', patientId: 'p1', department: '放射科',
  audience: 'doctor' as const, modality: 'CT', examName: '头颅CT平扫', bodyPart: '头颅',
  explainedFindings: [], overallDirection: null, plainLanguageSummary: null,
  recommendations: [], deepSource: 'rule' as const, model: null, llmStatus: 'rule_only' as const,
  status: 'pending_review' as const, generatedAt: new Date().toISOString(),
  reviewedBy: null, reviewedAt: null, rejectReason: null,
};

beforeEach(() => {
  useImagingInterpretStore.setState({ items: [], current: null, loading: false, error: null });
  vi.mocked(fetchImagingInterpQueue).mockResolvedValue({
    items: [{ id: 'q1', reportId: 'rep1', patientName: '张**', department: '放射科', modality: 'CT', examName: '头颅CT平扫', status: 'pending_review', updatedAt: new Date().toISOString() }],
  });
  vi.mocked(generateImagingInterp).mockResolvedValue(draft);
  vi.mocked(fetchImagingInterp).mockResolvedValue(draft);
  vi.mocked(signImagingInterp).mockResolvedValue({ ...draft, status: 'signed' });
  vi.mocked(rejectImagingInterp).mockResolvedValue({ ...draft, status: 'rejected' });
});

describe('imagingInterpretStore', () => {
  it('loadQueue 拉取队列（带视角参数）', async () => {
    await useImagingInterpretStore.getState().loadQueue(undefined, 'doctor');
    expect(useImagingInterpretStore.getState().items).toHaveLength(1);
    expect(fetchImagingInterpQueue).toHaveBeenCalledWith(undefined, 'doctor');
  });

  it('generate 生成影像解读并写入 current', async () => {
    const r = await useImagingInterpretStore.getState().generate('rep1', 'doctor', 'auto');
    expect(r.reportId).toBe('rep1');
    expect(useImagingInterpretStore.getState().current?.reportId).toBe('rep1');
    expect(generateImagingInterp).toHaveBeenCalledWith('rep1', 'doctor', 'auto');
  });

  it('fetchCurrent 加载已存在解读', async () => {
    await useImagingInterpretStore.getState().fetchCurrent('rep1', 'patient');
    expect(fetchImagingInterp).toHaveBeenCalledWith('rep1', 'patient');
    expect(useImagingInterpretStore.getState().current?.reportId).toBe('rep1');
  });

  it('签名 / 退回后刷新队列', async () => {
    await useImagingInterpretStore.getState().sign('q1');
    expect(signImagingInterp).toHaveBeenCalledWith('q1');
    await useImagingInterpretStore.getState().reject('q1', '图像模糊');
    expect(rejectImagingInterp).toHaveBeenCalledWith('q1', '图像模糊');
  });

  it('断库失败写入 error 且不吞', async () => {
    vi.mocked(fetchImagingInterpQueue).mockRejectedValueOnce(new Error('Connection refused'));
    await expect(useImagingInterpretStore.getState().loadQueue()).rejects.toThrow('Connection refused');
    expect(useImagingInterpretStore.getState().error).toBe('Connection refused');
  });
});
