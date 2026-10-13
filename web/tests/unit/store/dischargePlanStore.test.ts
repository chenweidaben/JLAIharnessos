/**
 * 健澜科技 jlmedaios - 出院计划 store 单测（M61-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/dischargePlan', () => ({
  createDischargePlan: vi.fn(), listDischargePlan: vi.fn(), pushDischargePlan: vi.fn(),
}));

import * as careApi from '@/services/api/care';
import * as dpApi from '@/services/api/dischargePlan';
import { useDischargeStore } from '@/store/dischargePlanStore';

const fake = {
  id: 'd1', visitId: 'v1', dischargeGuidance: 'g', medicationSummary: 'm',
  followupDate: '2026-11-01', followupDepartment: '内分泌科', status: 'planned' as const,
  createdBy: 'u1', createdAt: 'now',
};

describe('dischargePlanStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useDischargeStore.setState({ dbUp: null, visitId: '', items: [], suggestedDate: '', loading: false, error: null });
  });

  it('setVisit 拉取计划列表', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    (dpApi.listDischargePlan as ReturnType<typeof vi.fn>).mockResolvedValue([fake]);
    await useDischargeStore.getState().checkHealth();
    await useDischargeStore.getState().setVisit('v1');
    expect(dpApi.listDischargePlan).toHaveBeenCalledWith('v1');
    expect(useDischargeStore.getState().items[0].status).toBe('planned');
  });

  it('create 生成计划后刷新列表', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    (dpApi.createDischargePlan as ReturnType<typeof vi.fn>).mockResolvedValue({ plan: fake, suggestedFollowupDate: '2026-11-01' });
    (dpApi.listDischargePlan as ReturnType<typeof vi.fn>).mockResolvedValue([fake]);
    await useDischargeStore.getState().checkHealth();
    await useDischargeStore.getState().setVisit('v1');
    await useDischargeStore.getState().create({ medicationSummary: '二甲双胍' });
    expect(dpApi.createDischargePlan).toHaveBeenCalledWith(expect.objectContaining({ visitId: 'v1' }));
    expect(useDischargeStore.getState().suggestedDate).toBe('2026-11-01');
  });
});
