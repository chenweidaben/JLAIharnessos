/**
 * 健澜科技 jlmedaios - 在院费用监控 store 单测（M22-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/inpatientCostMonitor', () => ({ listMonitors: vi.fn(), dischargeReview: vi.fn() }));

import * as careApi from '@/services/api/care';
import * as mApi from '@/services/api/inpatientCostMonitor';
import { useInpatientCostStore } from '@/store/inpatientCostMonitorStore';

const care = careApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const m = mApi as unknown as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  vi.clearAllMocks();
  useInpatientCostStore.setState({ dbUp: null, monitors: [], loading: false, error: null });
});

describe('M22-B inpatient cost store', () => {
  it('db=up', async () => {
    care.getSystemHealth.mockResolvedValue({ db: 'up' });
    expect(await useInpatientCostStore.getState().checkHealth()).toBe(true);
  });
  it('load 落 monitors', async () => {
    care.getSystemHealth.mockResolvedValue({ db: 'up' });
    m.listMonitors.mockResolvedValueOnce([{ id: 'm1', level: 'over' }]);
    await useInpatientCostStore.getState().checkHealth();
    await useInpatientCostStore.getState().load();
    expect(useInpatientCostStore.getState().monitors).toHaveLength(1);
  });
  it('dbUp!=true review 拒绝', async () => {
    await expect(useInpatientCostStore.getState().review('v1')).rejects.toThrow(/不可用/);
  });
});
