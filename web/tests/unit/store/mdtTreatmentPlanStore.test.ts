/**
 * 健澜科技 jlmedaios - MDT 治疗方案 store 单测（M67-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/mdtTreatmentPlan', () => ({
  confirmPlan: vi.fn(), draftPlan: vi.fn(), listPlans: vi.fn(),
}));

import * as careApi from '@/services/api/care';
import * as pApi from '@/services/api/mdtTreatmentPlan';
import { useTreatmentPlanStore } from '@/store/mdtTreatmentPlanStore';

describe('treatmentPlanStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTreatmentPlanStore.setState({
      dbUp: null, visitId: '', items: [], loading: false, error: null,
    });
  });

  it('setVisit 拉方案列表', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    (pApi.listPlans as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'p1', planType: 'surgery', status: 'draft', draft: '建议手术' },
    ]);
    await useTreatmentPlanStore.getState().checkHealth();
    await useTreatmentPlanStore.getState().setVisit('v1');
    expect(useTreatmentPlanStore.getState().items[0].planType).toBe('surgery');
  });

  it('create 提交后刷新列表', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    (pApi.draftPlan as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (pApi.listPlans as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    await useTreatmentPlanStore.getState().checkHealth();
    await useTreatmentPlanStore.getState().setVisit('v1');
    await useTreatmentPlanStore.getState().create({ mdtConsultId: 'c1', departments: [], conclusion: '手术' });
    expect(pApi.draftPlan).toHaveBeenCalled();
  });
});
