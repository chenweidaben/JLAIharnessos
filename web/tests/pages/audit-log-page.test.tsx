/* ============================================================================
 * 健澜科技杠OS - 审计日志页面测试（M8-C）
 *
 * 覆盖：
 *  - 在线：统计卡片、操作分布/趋势图、表格渲染、筛选查询、详情抽屉、刷新；
 *  - 断库：显式离线 Alert，不渲染业务内容。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/
import { it as vitestIt, expect, beforeEach, vi } from 'vitest';
import type { TestFunction } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@test-utils';

const it = (name: string, fn: TestFunction) => vitestIt(name, fn, 60000);

vi.mock('@/components/charts/BaseChart', () => ({
  default: () => <div data-testid="chart" />,
}));

import AuditLogPage from '@/pages/AuditLogPage';
import type { AuditLogItem } from '@/types/adminLog';

vi.mock('@/services/api/adminLog', () => ({
  fetchAuditLogs: vi.fn(),
  fetchAuditOverview: vi.fn(),
  fetchAuditDistribution: vi.fn(),
  fetchAuditTrend: vi.fn(),
  fetchAuditLog: vi.fn(),
}));
vi.mock('@/services/api/pharmacy', () => ({ getSystemHealth: vi.fn() }));

import * as api from '@/services/api/adminLog';
import { getSystemHealth } from '@/services/api/pharmacy';

const m = api as unknown as Record<string, ReturnType<typeof vi.fn>>;

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
    detail: { a: 1 },
    createdAt: '2026-01-01T00:00:00Z',
    ...over,
  };
}

function paged(items: AuditLogItem[]) {
  return { items, total: items.length, page: 1, pageSize: 12 };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSystemHealth).mockResolvedValue({
    status: 'ok',
    version: '0.8.0',
    demoMode: false,
    db: 'up',
  });
  m.fetchAuditLogs.mockResolvedValue(
    paged([
      item(),
      item({
        seq: 2,
        result: 'failure',
        actorName: null,
        actorRole: null,
        riskLevel: 'high',
      }),
    ]),
  );
  m.fetchAuditOverview.mockResolvedValue({
    total: 200,
    today: 20,
    abnormal: 3,
    highRisk: 2,
  });
  m.fetchAuditDistribution.mockResolvedValue([{ action: 'user.create', count: 10 }]);
  m.fetchAuditTrend.mockResolvedValue([
    { date: '2026-01-01', total: 5, abnormal: 1 },
  ]);
  m.fetchAuditLog.mockResolvedValue(item());
});

async function waitOnline() {
  return screen.findByTestId('audit-content');
}

it('在线：渲染统计卡片与图表', async () => {
  render(<AuditLogPage />);
  await waitOnline();
  expect(screen.getByText('今日操作')).toBeInTheDocument();
  expect(screen.getByText('累计日志')).toBeInTheDocument();
  expect(screen.getAllByTestId('chart').length).toBe(2);
});

it('在线：表格渲染操作人、动作、结果标签', async () => {
  render(<AuditLogPage />);
  await waitOnline();
  expect(screen.getByText('管理员')).toBeInTheDocument();
  expect(screen.getAllByText('user.create').length).toBeGreaterThan(0);
  expect(screen.getAllByText('成功').length).toBeGreaterThan(0);
});

it('筛选：输入操作人并查询，调用 fetchAuditLogs 带 actorKeyword', async () => {
  render(<AuditLogPage />);
  await waitOnline();
  const input = screen.getByPlaceholderText('操作人姓名');
  fireEvent.change(input, { target: { value: '张三' } });
  fireEvent.click(screen.getByRole('button', { name: /查\s*询/ }));
  await waitFor(() => {
    const calls = m.fetchAuditLogs.mock.calls;
    const last = calls[calls.length - 1][0];
    expect(last.actorKeyword).toBe('张三');
  });
});

it('详情：点击查看打开抽屉，展示 detail JSON', async () => {
  render(<AuditLogPage />);
  await waitOnline();
  fireEvent.click(screen.getAllByRole('button', { name: /查\s*看/ })[0]);
  const drawer = await screen.findByRole('dialog');
  expect(within(drawer).getByText('user.create')).toBeInTheDocument();
  expect(within(drawer).getByText(/变更摘要/)).toBeInTheDocument();
});

it('刷新：点击刷新重新加载', async () => {
  render(<AuditLogPage />);
  await waitOnline();
  const before = m.fetchAuditLogs.mock.calls.length;
  fireEvent.click(screen.getByRole('button', { name: /刷\s*新/ }));
  await waitFor(() => expect(m.fetchAuditLogs.mock.calls.length).toBeGreaterThan(before));
});

it('风险列：高风险渲染标签，匿名操作人回退占位', async () => {
  render(<AuditLogPage />);
  await waitOnline();
  expect(screen.getByText('高')).toBeInTheDocument();
  expect(screen.getByText('（匿名/系统）')).toBeInTheDocument();
});

it('重置：点击重置清空关键字并重新加载', async () => {
  render(<AuditLogPage />);
  await waitOnline();
  const input = screen.getByPlaceholderText('操作人姓名');
  fireEvent.change(input, { target: { value: '张三' } });
  fireEvent.click(screen.getByRole('button', { name: /重\s*置/ }));
  await waitFor(() => expect(input).toHaveValue(''));
  const calls = m.fetchAuditLogs.mock.calls;
  const last = calls[calls.length - 1][0];
  expect(last.actorKeyword).toBeUndefined();
});

it('分页：点击下一页触发 setFilter 带 page', async () => {
  m.fetchAuditLogs.mockResolvedValue(
    paged(Array.from({ length: 13 }, (_, i) => item({ seq: i + 1 }))),
  );
  render(<AuditLogPage />);
  await waitOnline();
  fireEvent.click(screen.getByTitle('下一页'));
  await waitFor(() => {
    const calls = m.fetchAuditLogs.mock.calls;
    const last = calls[calls.length - 1][0];
    expect(last.page).toBe(2);
  });
});

it('断库恢复：点击 Alert 内刷新，探活成功后重新加载', async () => {
  // 初始断库
  vi.mocked(getSystemHealth).mockResolvedValue({
    status: 'degraded',
    version: '0.8.0',
    demoMode: false,
    db: 'down',
  });
  render(<AuditLogPage />);
  const alert = await screen.findByTestId('audit-offline-alert');
  // 恢复后再探活
  vi.mocked(getSystemHealth).mockResolvedValue({
    status: 'ok',
    version: '0.8.0',
    demoMode: false,
    db: 'up',
  });
  const before = m.fetchAuditLogs.mock.calls.length;
  fireEvent.click(within(alert).getByRole('button', { name: /刷\s*新/ }));
  await waitFor(() => expect(m.fetchAuditLogs.mock.calls.length).toBeGreaterThan(before));
});

it('风险列：无风险等级显示占位', async () => {
  m.fetchAuditLogs.mockResolvedValue(paged([item({ riskLevel: null })]));
  render(<AuditLogPage />);
  await waitOnline();
  expect(screen.getByText('—')).toBeInTheDocument();
});

it('断库：渲染离线 Alert，不渲染业务内容', async () => {
  vi.mocked(getSystemHealth).mockResolvedValue({
    status: 'degraded',
    version: '0.8.0',
    demoMode: false,
    db: 'down',
  });
  render(<AuditLogPage />);
  expect(await screen.findByTestId('audit-offline-alert')).toBeInTheDocument();
  expect(screen.queryByTestId('audit-content')).not.toBeInTheDocument();
});
