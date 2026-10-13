/**
 * 健澜科技 jlmedaios - STOP-BANG store 单测（M59-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/stopbang', () => ({ assessStopbang: vi.fn(), listStopbang: vi.fn() }));

import * as careApi from '@/services/api/care';
import * as sbApi from '@/services/api/stopbang';
import { useStopbangStore } from '@/store/stopbangStore';

const fake = {
  id: 's1', visitId: 'v1', sSnoring: true, tTired: false, oObserved: false, pPressure: false,
  bBmi: true, aAge: true, nNeck: false, gGender: false,
  score: 3, riskLevel: 'high' as const, assessor: 'u1', createdAt: 'now',
};

describe('stopbangStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStopbangStore.setState({ dbUp: null, visitId: '', items: [], loading: false, error: null });
  });

  it('setVisit 拉取筛查列表', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    (sbApi.listStopbang as ReturnType<typeof vi.fn>).mockResolvedValue([fake]);
    await useStopbangStore.getState().checkHealth();
    await useStopbangStore.getState().setVisit('v1');
    expect(sbApi.listStopbang).toHaveBeenCalledWith('v1');
    expect(useStopbangStore.getState().items[0].riskLevel).toBe('high');
  });

  it('assess 提交后刷新列表', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    (sbApi.assessStopbang as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (sbApi.listStopbang as ReturnType<typeof vi.fn>).mockResolvedValue([fake]);
    await useStopbangStore.getState().checkHealth();
    await useStopbangStore.getState().setVisit('v1');
    await useStopbangStore.getState().assess({ sSnoring: true, bBmi: true, aAge: true });
    expect(sbApi.assessStopbang).toHaveBeenCalledWith(expect.objectContaining({ visitId: 'v1', sSnoring: true }));
  });
});
