/**
 * 健澜科技 jlmedaios - 院感看板 store 单测（M76-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/infectionDashboard', () => ({
  listInfectionDash: vi.fn(), submitInfectionMetric: vi.fn(),
}));

import * as careApi from '@/services/api/care';
import * as iApi from '@/services/api/infectionDashboard';
import { useInfectionDashStore } from '@/store/infectionDashboardStore';

describe('infectionDashboardStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useInfectionDashStore.setState({
      dbUp: null, month: '', rows: [], loading: false, error: null,
    });
  });

  it('setMonth 拉看板行', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    (iApi.listInfectionDash as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'm1', department: 'ICU', handHygieneRate: 95 },
    ]);
    await useInfectionDashStore.getState().checkHealth();
    await useInfectionDashStore.getState().setMonth('2026-07');
    expect(useInfectionDashStore.getState().rows[0].department).toBe('ICU');
  });

  it('submit 提交后刷新', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    (iApi.submitInfectionMetric as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (iApi.listInfectionDash as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    await useInfectionDashStore.getState().checkHealth();
    await useInfectionDashStore.getState().setMonth('2026-07');
    await useInfectionDashStore.getState().submit({ month: '2026-07', department: 'ICU' });
    expect(iApi.submitInfectionMetric).toHaveBeenCalled();
  });
});
