/**
 * 健澜科技 jlmedaios - 营养会诊 store 单测（M58-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/nutritionConsult', () => ({
  consultNutrition: vi.fn(), listNutritionConsult: vi.fn(), followupNutritionConsult: vi.fn(),
}));

import * as careApi from '@/services/api/care';
import * as ncApi from '@/services/api/nutritionConsult';
import { useNutritionStore } from '@/store/nutritionConsultStore';

const fake = {
  id: 'n1', visitId: 'v1', consultType: 'routine' as const, nutritionDiagnosis: 'x',
  plan: 'y', caloriesPerDay: 2000, followupDays: 7, status: 'consulted' as const,
  dietitian: 'u1', createdAt: 'now', needsFollowup: true,
};

describe('nutritionConsultStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useNutritionStore.setState({ dbUp: null, visitId: '', items: [], loading: false, error: null });
  });

  it('setVisit 拉取会诊列表', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    (ncApi.listNutritionConsult as ReturnType<typeof vi.fn>).mockResolvedValue([fake]);
    await useNutritionStore.getState().checkHealth();
    await useNutritionStore.getState().setVisit('v1');
    expect(ncApi.listNutritionConsult).toHaveBeenCalledWith('v1');
    expect(useNutritionStore.getState().items[0].status).toBe('consulted');
  });

  it('consult 提交后刷新列表', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    (ncApi.consultNutrition as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (ncApi.listNutritionConsult as ReturnType<typeof vi.fn>).mockResolvedValue([fake]);
    await useNutritionStore.getState().checkHealth();
    await useNutritionStore.getState().setVisit('v1');
    await useNutritionStore.getState().consult({ nutritionDiagnosis: 'x', plan: 'y', caloriesPerDay: 2000 });
    expect(ncApi.consultNutrition).toHaveBeenCalledWith(expect.objectContaining({ visitId: 'v1' }));
  });
});
