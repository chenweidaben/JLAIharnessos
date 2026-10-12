/**
 * 健澜科技 jlmedaios - 成本归因 store 单测（M22-C）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/costAttribution', () => ({ attribution: vi.fn() }));

import * as careApi from '@/services/api/care';
import * as cApi from '@/services/api/costAttribution';
import { useCostAttributionStore } from '@/store/costAttributionStore';

const care = careApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const c = cApi as unknown as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  vi.clearAllMocks();
  useCostAttributionStore.setState({ dbUp: null, result: null, loading: false, error: null });
});

describe('M22-C cost attribution store', () => {
  it('db=up', async () => {
    care.getSystemHealth.mockResolvedValue({ db: 'up' });
    expect(await useCostAttributionStore.getState().checkHealth()).toBe(true);
  });
  it('load 落 result', async () => {
    care.getSystemHealth.mockResolvedValue({ db: 'up' });
    c.attribution.mockResolvedValueOnce({ visitId: 'v1', groupCode: 'g1', rows: [] });
    await useCostAttributionStore.getState().checkHealth();
    await useCostAttributionStore.getState().load('v1', 'g1');
    expect(useCostAttributionStore.getState().result?.groupCode).toBe('g1');
  });
  it('dbUp!=true load 拒绝', async () => {
    await useCostAttributionStore.getState().load('v1', 'g1');
    expect(useCostAttributionStore.getState().error).toMatch(/不可用/);
  });
});
