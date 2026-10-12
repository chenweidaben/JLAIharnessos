/**
 * 健澜科技 jlmedaios - DRG 预算 store 单测（M22-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/drgBudget', () => ({ listBudgets: vi.fn(), listAlerts: vi.fn(), ackAlert: vi.fn() }));

import * as careApi from '@/services/api/care';
import * as dApi from '@/services/api/drgBudget';
import { useDrgBudgetStore } from '@/store/drgBudgetStore';

const care = careApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const d = dApi as unknown as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  vi.clearAllMocks();
  useDrgBudgetStore.setState({ dbUp: null, budgets: [], alerts: [], loading: false, error: null });
});

describe('M22-A drg budget store', () => {
  it('db=up', async () => {
    care.getSystemHealth.mockResolvedValue({ db: 'up' });
    expect(await useDrgBudgetStore.getState().checkHealth()).toBe(true);
  });
  it('load 落 budgets+alerts', async () => {
    care.getSystemHealth.mockResolvedValue({ db: 'up' });
    d.listBudgets.mockResolvedValueOnce([{ id: 'b1' }]);
    d.listAlerts.mockResolvedValueOnce([{ id: 'a1' }]);
    await useDrgBudgetStore.getState().checkHealth();
    await useDrgBudgetStore.getState().load();
    expect(useDrgBudgetStore.getState().budgets).toHaveLength(1);
    expect(useDrgBudgetStore.getState().alerts).toHaveLength(1);
  });
  it('dbUp!=true ack 拒绝', async () => {
    await expect(useDrgBudgetStore.getState().ack('a1')).rejects.toThrow(/不可用/);
  });
});
