/**
 * 健澜科技 jlmedaios - DIP store 单测（M23-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/dip', () => ({ listPackets: vi.fn(), listPoints: vi.fn() }));

import * as careApi from '@/services/api/care';
import * as dApi from '@/services/api/dip';
import { useDipStore } from '@/store/dipStore';

const care = careApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const d = dApi as unknown as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  vi.clearAllMocks();
  useDipStore.setState({ dbUp: null, packets: [], points: [], loading: false, error: null });
});

describe('M23-A dip store', () => {
  it('db=up', async () => {
    care.getSystemHealth.mockResolvedValue({ db: 'up' });
    expect(await useDipStore.getState().checkHealth()).toBe(true);
  });
  it('load 落 packets+points', async () => {
    care.getSystemHealth.mockResolvedValue({ db: 'up' });
    d.listPackets.mockResolvedValueOnce([{ id: 'p1', packetCode: 'X', score: 10 }]);
    d.listPoints.mockResolvedValueOnce([{ id: 'm1', period: '2099-01', pointValue: 200 }]);
    await useDipStore.getState().checkHealth();
    await useDipStore.getState().load();
    expect(useDipStore.getState().packets).toHaveLength(1);
    expect(useDipStore.getState().points).toHaveLength(1);
  });
  it('dbUp!=true load 拒绝', async () => {
    await useDipStore.getState().load();
    expect(useDipStore.getState().error).toMatch(/不可用/);
  });
});
