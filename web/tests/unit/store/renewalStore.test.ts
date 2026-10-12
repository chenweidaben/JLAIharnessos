/**
 * 健澜科技 jlmedaios - 续方 store 单测（M21-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/renewal', () => ({ listMine: vi.fn(), pay: vi.fn(), dispense: vi.fn() }));

import * as careApi from '@/services/api/care';
import * as rApi from '@/services/api/renewal';
import { useRenewalStore } from '@/store/renewalStore';

const care = careApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const r = rApi as unknown as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  vi.clearAllMocks();
  useRenewalStore.setState({ dbUp: null, items: [], loading: false, error: null });
});

describe('M21-A renewal store', () => {
  it('db=up', async () => {
    care.getSystemHealth.mockResolvedValue({ db: 'up' });
    expect(await useRenewalStore.getState().checkHealth()).toBe(true);
  });
  it('load 落 items', async () => {
    care.getSystemHealth.mockResolvedValue({ db: 'up' });
    r.listMine.mockResolvedValueOnce([{ id: 'r1', rxNo: 'RX-1' }]);
    await useRenewalStore.getState().checkHealth();
    await useRenewalStore.getState().load('p1');
    expect(useRenewalStore.getState().items).toHaveLength(1);
  });
  it('dbUp!=true doPay 拒绝', async () => {
    await expect(useRenewalStore.getState().doPay('r1', 'p1')).rejects.toThrow(/不可用/);
  });
});
