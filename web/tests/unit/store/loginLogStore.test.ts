/* ============================================================================
 * 健澜科技杠OS - 登录日志 store 单测（M8-C）
 *
 * 覆盖：健康门禁、列表/概览/趋势加载、筛选、强制下线（成功 reload/失败）、清错。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useLoginLogStore } from '@/store/loginLogStore';
import type { LoginLogItem } from '@/types/adminLog';

vi.mock('@/services/api/adminLog', () => ({
  fetchLoginLogs: vi.fn(),
  fetchLoginOverview: vi.fn(),
  fetchLoginTrend: vi.fn(),
  forceUserLogout: vi.fn(),
}));
vi.mock('@/services/api/pharmacy', () => ({ getSystemHealth: vi.fn() }));

import {
  fetchLoginLogs,
  fetchLoginOverview,
  fetchLoginTrend,
  forceUserLogout,
} from '@/services/api/adminLog';
import { getSystemHealth } from '@/services/api/pharmacy';

function logItem(over: Partial<LoginLogItem> = {}): LoginLogItem {
  return {
    id: 1,
    username: 'admin',
    userId: 'u1',
    realName: '管理员',
    department: '信息科',
    success: true,
    failReason: null,
    ip: '127.0.0.1',
    userAgent: 'vitest',
    online: true,
    createdAt: '2026-01-01T00:00:00Z',
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  useLoginLogStore.setState({
    dbUp: false,
    items: [],
    total: 0,
    overview: null,
    trend: [],
    loading: false,
    acting: false,
    error: null,
    filter: { keyword: '', page: 1, pageSize: 12 },
  });
  vi.mocked(getSystemHealth).mockResolvedValue({
    status: 'ok',
    version: '0.8.0',
    demoMode: false,
    db: 'up',
  });
  vi.mocked(fetchLoginLogs).mockResolvedValue({
    items: [logItem()],
    total: 1,
    page: 1,
    pageSize: 12,
  });
  vi.mocked(fetchLoginOverview).mockResolvedValue({
    today: 10,
    online: 3,
    todayFail: 1,
    failRate: 5,
  });
  vi.mocked(fetchLoginTrend).mockResolvedValue([
    { date: '2026-01-01', success: 5, failure: 1 },
  ]);
});

describe('loginLogStore 健康门禁', () => {
  it('DB up → dbUp=true', async () => {
    const up = await useLoginLogStore.getState().checkHealth();
    expect(up).toBe(true);
  });

  it('健康检查失败 → dbUp=false', async () => {
    vi.mocked(getSystemHealth).mockRejectedValueOnce(new Error('down'));
    const up = await useLoginLogStore.getState().checkHealth();
    expect(up).toBe(false);
  });
});

describe('loginLogStore 加载', () => {
  it('load 并行取列表/概览/趋势', async () => {
    await useLoginLogStore.getState().load();
    const s = useLoginLogStore.getState();
    expect(s.items).toHaveLength(1);
    expect(s.overview?.online).toBe(3);
    expect(s.trend).toHaveLength(1);
  });

  it('load 失败 → 错误', async () => {
    vi.mocked(fetchLoginLogs).mockRejectedValueOnce(new Error('boom'));
    await useLoginLogStore.getState().load();
    expect(useLoginLogStore.getState().error).toContain('加载失败');
  });
});

describe('loginLogStore 筛选与强制下线', () => {
  it('setFilter 合并', () => {
    useLoginLogStore.getState().setFilter({ success: false });
    expect(useLoginLogStore.getState().filter.success).toBe(false);
  });

  it('forceLogout 成功 → reload 并返回 true', async () => {
    vi.mocked(forceUserLogout).mockResolvedValueOnce({ revoked: 2 });
    const ok = await useLoginLogStore.getState().forceLogout('u1');
    expect(ok).toBe(true);
    expect(forceUserLogout).toHaveBeenCalledWith('u1');
    expect(fetchLoginLogs).toHaveBeenCalled();
  });

  it('forceLogout 失败 → 错误并返回 false', async () => {
    vi.mocked(forceUserLogout).mockRejectedValueOnce(new Error('denied'));
    const ok = await useLoginLogStore.getState().forceLogout('u1');
    expect(ok).toBe(false);
    expect(useLoginLogStore.getState().error).toContain('强制下线失败');
  });

  it('clearError 清错', () => {
    useLoginLogStore.setState({ error: 'e' });
    useLoginLogStore.getState().clearError();
    expect(useLoginLogStore.getState().error).toBeNull();
  });
});
