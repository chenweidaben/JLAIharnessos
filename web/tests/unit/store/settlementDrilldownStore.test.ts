/**
 * 健澜科技 jlmedaios - 结算下钻 store 单测（M23-E）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/settlementDrilldown', () => ({ drilldown: vi.fn() }));

import * as careApi from '@/services/api/care';
import * as dApi from '@/services/api/settlementDrilldown';
import { useDrilldownStore } from '@/store/settlementDrilldownStore';

const care = careApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const d = dApi as unknown as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  vi.clearAllMocks();
  useDrilldownStore.setState({ dbUp: null, result: { byDepartment: [], byDoctor: [] }, loading: false, error: null });
});

describe('M23-E drilldown store', () => {
  it('db=up', async () => {
    care.getSystemHealth.mockResolvedValue({ db: 'up' });
    expect(await useDrilldownStore.getState().checkHealth()).toBe(true);
  });
  it('load 落 result', async () => {
    care.getSystemHealth.mockResolvedValue({ db: 'up' });
    d.drilldown.mockResolvedValueOnce({ byDepartment: [{ key: 'A', label: 'A', cases: 1, settlementTotal: 1, overspendRate: 0, drugRatio: 0 }], byDoctor: [] });
    await useDrilldownStore.getState().checkHealth();
    await useDrilldownStore.getState().load('2099-10');
    expect(useDrilldownStore.getState().result.byDepartment).toHaveLength(1);
  });
  it('dbUp!=true load 拒绝', async () => {
    await useDrilldownStore.getState().load('2099-10');
    expect(useDrilldownStore.getState().error).toMatch(/不可用/);
  });
});
