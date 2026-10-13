/**
 * 健澜科技 jlmedaios - 手术核查表 store 单测（M82-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/surgicalChecklist', () => ({
  createSurgicalChecklist: vi.fn(),
  signinStage: vi.fn(),
  timeoutStage: vi.fn(),
  signoutStage: vi.fn(),
}));

import * as sApi from '@/services/api/surgicalChecklist';
import { useSurgicalCheckStore } from '@/store/surgicalChecklistStore';

const mk = (status: 'in_progress' | 'passed' | 'failed' = 'in_progress') => ({
  id: 'c1', surgeryId: 's1', signinComplete: false, timeoutComplete: false, signoutComplete: false,
  patientConfirmed: false, siteMarked: false, procedureConfirmed: false, allergyConfirmed: false,
  antibioticGiven: false, bloodPrepared: false, instrumentsCounted: false, status,
});

describe('surgicalChecklistStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSurgicalCheckStore.setState({ current: null, loading: false, error: null });
  });

  it('create 建单', async () => {
    (sApi.createSurgicalChecklist as ReturnType<typeof vi.fn>).mockResolvedValue(mk());
    await useSurgicalCheckStore.getState().create('s1');
    expect(useSurgicalCheckStore.getState().current?.surgeryId).toBe('s1');
  });

  it('signin 录入后刷新', async () => {
    useSurgicalCheckStore.setState({ current: mk() });
    (sApi.signinStage as ReturnType<typeof vi.fn>).mockResolvedValue(mk('failed'));
    await useSurgicalCheckStore.getState().signin({ patientConfirmed: true });
    expect(sApi.signinStage).toHaveBeenCalled();
  });
});
