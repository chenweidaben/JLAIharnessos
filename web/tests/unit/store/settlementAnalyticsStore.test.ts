/**
 * 健澜科技 jlmedaios - 结算分析 store 单测（M23-D）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/settlementAnalytics', () => ({ analytics: vi.fn() }));

import * as careApi from '@/services/api/care';
import * as aApi from '@/services/api/settlementAnalytics';
import { useAnalyticsStore } from '@/store/settlementAnalyticsStore';

const care = careApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const a = aApi as unknown as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  vi.clearAllMocks();
  useAnalyticsStore.setState({ dbUp: null, points: [], loading: false, error: null });
});

describe('M23-D analytics store', () => {
  it('db=up', async () => {
    care.getSystemHealth.mockResolvedValue({ db: 'up' });
    expect(await useAnalyticsStore.getState().checkHealth()).toBe(true);
  });
  it('load 落 points', async () => {
    care.getSystemHealth.mockResolvedValue({ db: 'up' });
    a.analytics.mockResolvedValueOnce([{ period: '2099-01', settlementTrend: 'up' }]);
    await useAnalyticsStore.getState().checkHealth();
    await useAnalyticsStore.getState().load();
    expect(useAnalyticsStore.getState().points).toHaveLength(1);
  });
  it('dbUp!=true load 拒绝', async () => {
    await useAnalyticsStore.getState().load();
    expect(useAnalyticsStore.getState().error).toMatch(/不可用/);
  });
});
