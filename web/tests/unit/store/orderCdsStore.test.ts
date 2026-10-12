/**
 * 健澜科技 jlmedaios - 医嘱开方 CDS store 单测（M18-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/request', () => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));

import * as careApi from '@/services/api/care';
import * as req from '@/services/request';
import { useOrderCdsStore } from '@/store/orderCdsStore';

const care = careApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const rq = req as unknown as Record<string, ReturnType<typeof vi.fn>>;

const health = (db: 'up' | 'down' = 'up') => ({ status: 'ok', version: '0.3.0', demoMode: false, db });

beforeEach(() => {
  vi.clearAllMocks();
  useOrderCdsStore.setState({ dbUp: null, health: null, alerts: [], unresolvedHard: 0, loading: false, error: null });
});

describe('M18-A cds store', () => {
  it('db=up', async () => {
    care.getSystemHealth.mockResolvedValue(health('up'));
    expect(await useOrderCdsStore.getState().checkHealth()).toBe(true);
  });
  it('db=down', async () => {
    care.getSystemHealth.mockRejectedValue(new Error('x'));
    expect(await useOrderCdsStore.getState().checkHealth()).toBe(false);
  });
  it('load 落数据', async () => {
    rq.get.mockResolvedValueOnce({ alerts: [{ id: 'a1', severity: 'hard', message: 'm' }], unresolvedHard: 1 });
    await useOrderCdsStore.getState().load('v');
    expect(useOrderCdsStore.getState().unresolvedHard).toBe(1);
  });
  it('dbUp!=true override 拒绝', async () => {
    await expect(useOrderCdsStore.getState().override('id', 'r', 'v')).rejects.toThrow(/不可用/);
  });
});
