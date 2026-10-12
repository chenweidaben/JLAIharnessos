/**
 * 健澜科技 jlmedaios - 管路护理 Zustand store 单测（M17-C）
 *
 * mock services/api/tubeCare 与 services/api/request，验证：
 *  - 健康门禁（up/down）；加载；写门禁。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/request', () => ({
  get: vi.fn(),
  post: vi.fn(),
}));
vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));

import * as careApi from '@/services/api/care';
import * as req from '@/services/request';
import { useTubeCareStore } from '@/store/tubeCareStore';

const care = careApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const rq = req as unknown as Record<string, ReturnType<typeof vi.fn>>;

const health = (db: 'up' | 'down' = 'up') => ({ status: 'ok', version: '0.3.0', demoMode: false, db });

beforeEach(() => {
  vi.clearAllMocks();
  useTubeCareStore.setState({
    dbUp: null, health: null, tubes: [], metrics: null, loading: false, acting: false, error: null,
  });
});

describe('M17-C store', () => {
  it('db=up => dbUp=true', async () => {
    care.getSystemHealth.mockResolvedValue(health('up'));
    expect(await useTubeCareStore.getState().checkHealth()).toBe(true);
  });
  it('db=down => dbUp=false', async () => {
    care.getSystemHealth.mockRejectedValue(new Error('ECONNREFUSED'));
    expect(await useTubeCareStore.getState().checkHealth()).toBe(false);
    expect(useTubeCareStore.getState().dbUp).toBe(false);
  });
  it('loadTubes 落 tubes', async () => {
    rq.get.mockResolvedValue([{ id: 't1', tubeType: 'cvc' }]);
    await useTubeCareStore.getState().loadTubes();
    expect(useTubeCareStore.getState().tubes).toHaveLength(1);
  });
  it('loadMetrics 落 metrics', async () => {
    rq.get.mockResolvedValue({ totalTubes: 1, metrics: { rate: 50, fractions: { rate: { numerator: 1, denominator: 2 } } } });
    await useTubeCareStore.getState().loadMetrics();
    expect(useTubeCareStore.getState().metrics?.metrics.rate).toBe(50);
  });
  it('dbUp!=true 时 insert 拒绝', async () => {
    await expect(useTubeCareStore.getState().insert({ visitId: 'v', tubeType: 'cvc' })).rejects.toThrow(/不可用/);
  });
});
