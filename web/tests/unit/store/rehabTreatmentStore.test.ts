/**
 * 健澜科技 jlmedaios - 康复治疗 store/utils 单测（M51-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/rehabTreatment', () => ({
  listTreatments: vi.fn(),
  prescribeTreatment: vi.fn(),
  signTreatment: vi.fn(),
  completeTreatment: vi.fn(),
}));

import * as careApi from '@/services/api/care';
import * as rehabApi from '@/services/api/rehabTreatment';
import { useRehabStore } from '@/store/rehabTreatmentStore';
import { STATUS_LABEL, MODALITY_LABEL } from '@/utils/rehabTreatment';

const fakeItem = {
  id: 't1', visitId: 'v1', modality: 'pt', prescribedBy: 'u1', scheduledDate: '2026-10-14',
  status: 'prescribed', executedAt: null, executedBy: null, efficacy: null, note: null, createdAt: '',
};

describe('rehabTreatmentStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRehabStore.setState({ dbUp: null, visitId: '', items: [], loading: false, error: null });
  });

  it('checkHealth 成功置 dbUp', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    expect(await useRehabStore.getState().checkHealth()).toBe(true);
  });

  it('setVisit 成功加载列表', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    (rehabApi.listTreatments as ReturnType<typeof vi.fn>).mockResolvedValue([fakeItem]);
    await useRehabStore.getState().checkHealth();
    await useRehabStore.getState().setVisit('v1');
    expect(rehabApi.listTreatments).toHaveBeenCalledWith('v1');
    expect(useRehabStore.getState().items).toHaveLength(1);
  });

  it('sign 调用后刷新列表', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    (rehabApi.listTreatments as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (rehabApi.signTreatment as ReturnType<typeof vi.fn>).mockResolvedValue({});
    await useRehabStore.getState().checkHealth();
    await useRehabStore.getState().setVisit('v1');
    await useRehabStore.getState().sign('t1');
    expect(rehabApi.signTreatment).toHaveBeenCalledWith('t1');
  });

  it('complete 传疗效', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    (rehabApi.listTreatments as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (rehabApi.completeTreatment as ReturnType<typeof vi.fn>).mockResolvedValue({});
    await useRehabStore.getState().checkHealth();
    await useRehabStore.getState().setVisit('v1');
    await useRehabStore.getState().complete('t1', 'poor');
    expect(rehabApi.completeTreatment).toHaveBeenCalledWith('t1', { efficacy: 'poor', note: undefined });
  });
});

describe('rehabTreatment utils', () => {
  it('状态/方式标签映射', () => {
    expect(STATUS_LABEL.completed).toBe('已完成');
    expect(MODALITY_LABEL.pt).toContain('PT');
  });
});
