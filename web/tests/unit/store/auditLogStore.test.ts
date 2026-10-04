/* ============================================================================
 * 健澜科技杠OS - 审计日志 store 单测（M8-C）
 *
 * 覆盖：健康门禁、列表/概览/分布/趋势加载、筛选设置/重置、详情、错误分支。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuditLogStore } from '@/store/auditLogStore';
import type { AuditLogItem } from '@/types/adminLog';

vi.mock('@/services/api/adminLog', () => ({
  fetchAuditLogs: vi.fn(),
  fetchAuditOverview: vi.fn(),
  fetchAuditDistribution: vi.fn(),
  fetchAuditTrend: vi.fn(),
  fetchAuditLog: vi.fn(),
}));
vi.mock('@/services/api/pharmacy', () => ({ getSystemHealth: vi.fn() }));

import {
  fetchAuditLogs,
  fetchAuditOverview,
  fetchAuditDistribution,
  fetchAuditTrend,
  fetchAuditLog,
} from '@/services/api/adminLog';
import { getSystemHealth } from '@/services/api/pharmacy';

function item(over: Partial<AuditLogItem> = {}): AuditLogItem {
  return {
    seq: 1,
    traceId: 't1',
    actorId: 'u1',
    actorName: '管理员',
    actorRole: 'admin',
    action: 'user.create',
    resourceType: 'user',
    resourceId: 'x1',
    result: 'success',
    riskLevel: 'medium',
    clientIp: '127.0.0.1',
    userAgent: 'vitest',
    detail: {},
    createdAt: '2026-01-01T00:00:00Z',
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuditLogStore.setState({
    dbUp: false,
    items: [],
    total: 0,
    overview: null,
    distribution: [],
    trend: [],
    selected: null,
    loading: false,
    error: null,
    filter: { actorKeyword: '', page: 1, pageSize: 12 },
  });
  vi.mocked(getSystemHealth).mockResolvedValue({
    status: 'ok',
    version: '0.8.0',
    demoMode: false,
    db: 'up',
  });
  vi.mocked(fetchAuditLogs).mockResolvedValue({
    items: [item()],
    total: 1,
    page: 1,
    pageSize: 12,
  });
  vi.mocked(fetchAuditOverview).mockResolvedValue({
    total: 100,
    today: 5,
    abnormal: 2,
    highRisk: 1,
  });
  vi.mocked(fetchAuditDistribution).mockResolvedValue([
    { action: 'user.create', count: 10 },
  ]);
  vi.mocked(fetchAuditTrend).mockResolvedValue([
    { date: '2026-01-01', total: 3, abnormal: 0 },
  ]);
});

describe('auditLogStore 健康门禁', () => {
  it('DB up → dbUp=true', async () => {
    const up = await useAuditLogStore.getState().checkHealth();
    expect(up).toBe(true);
    expect(useAuditLogStore.getState().dbUp).toBe(true);
  });

  it('健康检查抛错 → dbUp=false 且有错误', async () => {
    vi.mocked(getSystemHealth).mockRejectedValueOnce(new Error('down'));
    const up = await useAuditLogStore.getState().checkHealth();
    expect(up).toBe(false);
    expect(useAuditLogStore.getState().error).toContain('连接失败');
  });
});

describe('auditLogStore 加载', () => {
  it('load 并行取列表/概览/分布/趋势并写入', async () => {
    await useAuditLogStore.getState().load();
    const s = useAuditLogStore.getState();
    expect(s.items).toHaveLength(1);
    expect(s.total).toBe(1);
    expect(s.overview?.total).toBe(100);
    expect(s.distribution).toHaveLength(1);
    expect(s.trend).toHaveLength(1);
  });

  it('load 失败 → 设置错误', async () => {
    vi.mocked(fetchAuditLogs).mockRejectedValueOnce(new Error('boom'));
    await useAuditLogStore.getState().load();
    expect(useAuditLogStore.getState().error).toContain('加载失败');
  });
});

describe('auditLogStore 筛选与详情', () => {
  it('setFilter 合并并重置页码', () => {
    useAuditLogStore.getState().setFilter({ result: 'success' });
    const f = useAuditLogStore.getState().filter;
    expect(f.result).toBe('success');
    expect(f.page).toBe(1);
  });

  it('setFilter 显式传 page 时保留', () => {
    useAuditLogStore.getState().setFilter({ page: 3 });
    expect(useAuditLogStore.getState().filter.page).toBe(3);
  });

  it('resetFilter 回到初始', () => {
    useAuditLogStore.getState().setFilter({ result: 'failure' });
    useAuditLogStore.getState().resetFilter();
    expect(useAuditLogStore.getState().filter).toEqual({
      actorKeyword: '',
      page: 1,
      pageSize: 12,
    });
  });

  it('openDetail 写入 selected，closeDetail 清空', async () => {
    vi.mocked(fetchAuditLog).mockResolvedValueOnce(item({ seq: 9 }));
    await useAuditLogStore.getState().openDetail(9);
    expect(useAuditLogStore.getState().selected?.seq).toBe(9);
    useAuditLogStore.getState().closeDetail();
    expect(useAuditLogStore.getState().selected).toBeNull();
  });

  it('openDetail 失败 → 设置错误', async () => {
    vi.mocked(fetchAuditLog).mockRejectedValueOnce(new Error('x'));
    await useAuditLogStore.getState().openDetail(1);
    expect(useAuditLogStore.getState().error).toContain('详情加载失败');
  });

  it('clearError 清错', () => {
    useAuditLogStore.setState({ error: 'e' });
    useAuditLogStore.getState().clearError();
    expect(useAuditLogStore.getState().error).toBeNull();
  });
});
