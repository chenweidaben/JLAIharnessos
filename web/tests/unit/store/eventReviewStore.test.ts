/**
 * 健澜科技 jlmedaios - 不良事件评估 Zustand store 单测（M17-D）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/request', () => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));

import * as careApi from '@/services/api/care';
import * as req from '@/services/request';
import { useEventReviewStore } from '@/store/eventReviewStore';

const care = careApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const rq = req as unknown as Record<string, ReturnType<typeof vi.fn>>;

const health = (db: 'up' | 'down' = 'up') => ({ status: 'ok', version: '0.3.0', demoMode: false, db });

beforeEach(() => {
  vi.clearAllMocks();
  useEventReviewStore.setState({
    dbUp: null, health: null, events: [], reviews: [], metrics: null, loading: false, acting: false, error: null,
  });
});

describe('M17-D store', () => {
  it('db=up => dbUp=true', async () => {
    care.getSystemHealth.mockResolvedValue(health('up'));
    expect(await useEventReviewStore.getState().checkHealth()).toBe(true);
  });
  it('db=down => dbUp=false', async () => {
    care.getSystemHealth.mockRejectedValue(new Error('ECONNREFUSED'));
    expect(await useEventReviewStore.getState().checkHealth()).toBe(false);
  });
  it('load 落数据', async () => {
    rq.get
      .mockResolvedValueOnce([{ id: 'e1', eventType: 'fall' }])
      .mockResolvedValueOnce([{ id: 'r1', eventId: 'e1' }])
      .mockResolvedValueOnce({ totalEvents: 1, inpatientVisits: 5, metrics: { pressureInjuryRate: 0, fallRate: 20, fractions: { pressureInjury: { numerator: 0, denominator: 5 }, fall: { numerator: 1, denominator: 5 } } } });
    await useEventReviewStore.getState().load();
    expect(useEventReviewStore.getState().events).toHaveLength(1);
    expect(useEventReviewStore.getState().metrics?.metrics.fallRate).toBe(20);
  });
  it('dbUp!=true 时 submit 拒绝', async () => {
    await expect(useEventReviewStore.getState().submit({ eventId: 'e', visitId: 'v', occurredAt: '2026' })).rejects.toThrow(/不可用/);
  });
});
