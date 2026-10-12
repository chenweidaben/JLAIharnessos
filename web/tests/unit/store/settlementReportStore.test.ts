/**
 * 健澜科技 jlmedaios - 月度结算报表 store 单测（M23-C）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/settlementReport', () => ({ list: vi.fn() }));

import * as careApi from '@/services/api/care';
import * as rApi from '@/services/api/settlementReport';
import { useReportStore } from '@/store/settlementReportStore';

const care = careApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const r = rApi as unknown as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  vi.clearAllMocks();
  useReportStore.setState({ dbUp: null, rows: [], loading: false, error: null });
});

describe('M23-C report store', () => {
  it('db=up', async () => {
    care.getSystemHealth.mockResolvedValue({ db: 'up' });
    expect(await useReportStore.getState().checkHealth()).toBe(true);
  });
  it('load 落 rows', async () => {
    care.getSystemHealth.mockResolvedValue({ db: 'up' });
    r.list.mockResolvedValueOnce([{ id: 'x', period: '2099-01' }]);
    await useReportStore.getState().checkHealth();
    await useReportStore.getState().load();
    expect(useReportStore.getState().rows).toHaveLength(1);
  });
  it('dbUp!=true load 拒绝', async () => {
    await useReportStore.getState().load();
    expect(useReportStore.getState().error).toMatch(/不可用/);
  });
});
