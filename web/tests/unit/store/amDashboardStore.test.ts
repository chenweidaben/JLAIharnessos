/**
 * 健澜科技 jlmedaios - 药事看板 store 单测（M77-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/amDashboard', () => ({
  listAmDash: vi.fn(), submitAmMetric: vi.fn(),
}));

import * as careApi from '@/services/api/care';
import * as aApi from '@/services/api/amDashboard';
import { useAmDashStore } from '@/store/amDashboardStore';

describe('amDashboardStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAmDashStore.setState({
      dbUp: null, month: '', rows: [], loading: false, error: null,
    });
  });

  it('setMonth 拉看板行', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    (aApi.listAmDash as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'a1', department: '内科', dddsPer100: 35 },
    ]);
    await useAmDashStore.getState().checkHealth();
    await useAmDashStore.getState().setMonth('2026-07');
    expect(useAmDashStore.getState().rows[0].department).toBe('内科');
  });

  it('submit 提交后刷新', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    (aApi.submitAmMetric as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (aApi.listAmDash as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    await useAmDashStore.getState().checkHealth();
    await useAmDashStore.getState().setMonth('2026-07');
    await useAmDashStore.getState().submit({ month: '2026-07', department: '内科' });
    expect(aApi.submitAmMetric).toHaveBeenCalled();
  });
});
