/**
 * 健澜科技 jlmedaios - 报告推送 store 单测（M19-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/reportPush', () => ({ listMine: vi.fn(), markViewed: vi.fn() }));

import * as careApi from '@/services/api/care';
import * as rpApi from '@/services/api/reportPush';
import { useReportPushStore } from '@/store/reportPushStore';

const care = careApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const rp = rpApi as unknown as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  vi.clearAllMocks();
  useReportPushStore.setState({ dbUp: null, items: [], unread: 0, loading: false, error: null });
});

describe('M19-B report push store', () => {
  it('db=up', async () => {
    care.getSystemHealth.mockResolvedValue({ db: 'up' });
    expect(await useReportPushStore.getState().checkHealth()).toBe(true);
  });
  it('load 落 items+unread', async () => {
    care.getSystemHealth.mockResolvedValue({ db: 'up' });
    rp.listMine.mockResolvedValueOnce({ items: [{ id: 'p1', status: 'pushed' }], unread: 1 });
    await useReportPushStore.getState().checkHealth();
    await useReportPushStore.getState().load('patient-1');
    expect(useReportPushStore.getState().unread).toBe(1);
  });
  it('dbUp!=true view 拒绝', async () => {
    await expect(useReportPushStore.getState().view('p1', 'x')).rejects.toThrow(/不可用/);
  });
});
