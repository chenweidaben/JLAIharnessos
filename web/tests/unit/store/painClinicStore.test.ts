/**
 * 健澜科技 jlmedaios - 疼痛门诊 store/utils 单测（M52-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/painClinic', () => ({
  listPainClinic: vi.fn(),
  recordPainClinic: vi.fn(),
}));

import * as careApi from '@/services/api/care';
import * as painApi from '@/services/api/painClinic';
import { usePainStore } from '@/store/painClinicStore';
import { nrsLevel } from '@/utils/painClinic';

const fakeRecord = {
  id: 'r1', patientId: 'p1', visitId: null, baselineNrs: 6, currentNrs: 4,
  breakthroughCount: 1, analgesic: 'morphine', doseNote: null, titrationRound: 1,
  adjustmentSuggestion: 'x', recordedBy: 'u1', createdAt: '',
};

describe('painClinicStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePainStore.setState({ dbUp: null, patientId: '', items: [], loading: false, error: null });
  });

  it('checkHealth 成功置 dbUp', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    expect(await usePainStore.getState().checkHealth()).toBe(true);
  });

  it('setPatient 加载列表', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    (painApi.listPainClinic as ReturnType<typeof vi.fn>).mockResolvedValue([fakeRecord]);
    await usePainStore.getState().checkHealth();
    await usePainStore.getState().setPatient('p1');
    expect(painApi.listPainClinic).toHaveBeenCalledWith('p1');
    expect(usePainStore.getState().items).toHaveLength(1);
  });

  it('record 后刷新列表', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    (painApi.listPainClinic as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (painApi.recordPainClinic as ReturnType<typeof vi.fn>).mockResolvedValue({});
    await usePainStore.getState().checkHealth();
    await usePainStore.getState().setPatient('p1');
    await usePainStore.getState().record({ baselineNrs: 6, currentNrs: 4, analgesic: 'morphine' });
    expect(painApi.recordPainClinic).toHaveBeenCalledWith({
      patientId: 'p1', baselineNrs: 6, currentNrs: 4, analgesic: 'morphine',
    });
  });
});

describe('painClinic utils', () => {
  it('nrsLevel 分级', () => {
    expect(nrsLevel(8)).toBe('重度');
    expect(nrsLevel(5)).toBe('中度');
    expect(nrsLevel(2)).toBe('轻度');
  });
});
