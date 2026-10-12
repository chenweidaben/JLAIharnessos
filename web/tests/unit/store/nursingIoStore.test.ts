/**
 * 健澜科技 jlmedaios - 出入量 store 单测（M17-E）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/request', () => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));

import * as careApi from '@/services/api/care';
import * as req from '@/services/request';
import { useNursingIoStore } from '@/store/nursingIoStore';

const care = careApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const rq = req as unknown as Record<string, ReturnType<typeof vi.fn>>;

const health = (db: 'up' | 'down' = 'up') => ({ status: 'ok', version: '0.3.0', demoMode: false, db });

beforeEach(() => {
  vi.clearAllMocks();
  useNursingIoStore.setState({
    dbUp: null, health: null, records: [], balance: null, loading: false, acting: false, error: null,
  });
});

describe('M17-E store', () => {
  it('db=up', async () => {
    care.getSystemHealth.mockResolvedValue(health('up'));
    expect(await useNursingIoStore.getState().checkHealth()).toBe(true);
  });
  it('db=down', async () => {
    care.getSystemHealth.mockRejectedValue(new Error('x'));
    expect(await useNursingIoStore.getState().checkHealth()).toBe(false);
  });
  it('load 落数据', async () => {
    rq.get.mockResolvedValueOnce([{ id: 'i1', direction: 'intake', amountMl: 100 }])
      .mockResolvedValueOnce({ all: { intakeTotal: 100, outputTotal: 0, balance: 100 }, last24h: { intakeTotal: 100, outputTotal: 0, balance: 100 }, byShift: {} });
    await useNursingIoStore.getState().load('v');
    expect(useNursingIoStore.getState().records).toHaveLength(1);
  });
  it('dbUp!=true submit 拒绝', async () => {
    await expect(useNursingIoStore.getState().submit({ visitId: 'v', direction: 'intake', category: 'oral', amountMl: 1 })).rejects.toThrow(/不可用/);
  });
});
