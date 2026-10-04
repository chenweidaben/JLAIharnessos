/* ============================================================================
 * 健澜科技杠OS - 登录日志页面测试（M8-C）
 *
 * 覆盖：
 *  - 在线：统计卡片、趋势图、表格渲染、筛选、强制下线 Popconfirm、详情抽屉；
 *  - 断库：显式离线 Alert。
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

import LoginLogPage from '@/pages/LoginLogPage';
import type { LoginLogItem } from '@/types/adminLog';

vi.mock('@/services/api/adminLog', () => ({
  fetchLoginLogs: vi.fn(),
  fetchLoginOverview: vi.fn(),
  fetchLoginTrend: vi.fn(),
  forceUserLogout: vi.fn(),
}));
vi.mock('@/services/api/pharmacy', () => ({ getSystemHealth: vi.fn() }));

import * as api from '@/services/api/adminLog';
import { getSystemHealth } from '@/services/api/pharmacy';

const m = api as unknown as Record<string, ReturnType<typeof vi.fn>>;

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
    userAgent: 'vitest browser',
    online: true,
    createdAt: '2026-01-01T00:00:00Z',
    ...over,
  };
}

function paged(items: LoginLogItem[]) {
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
  m.fetchLoginLogs.mockResolvedValue(
    paged([
      logItem(),
      logItem({
        id: 2,
        success: false,
        online: false,
        failReason: '用户名或密码错误',
        username: 'unknown',
        realName: null,
      }),
    ]),
  );
  m.fetchLoginOverview.mockResolvedValue({
    today: 15,
    online: 4,
    todayFail: 1,
    failRate: 6.7,
  });
  m.fetchLoginTrend.mockResolvedValue([
    { date: '2026-01-01', success: 10, failure: 1 },
  ]);
  m.forceUserLogout.mockResolvedValue({ revoked: 1 });
});

async function waitOnline() {
  return screen.findByTestId('loginlog-content');
}

it('在线：渲染统计卡片与趋势图', async () => {
  render(<LoginLogPage />);
  await waitOnline();
  expect(screen.getByText('今日登录')).toBeInTheDocument();
  expect(screen.getByText('当前在线')).toBeInTheDocument();
  expect(screen.getByTestId('chart')).toBeInTheDocument();
});

it('在线：表格渲染成功/失败与在线状态', async () => {
  render(<LoginLogPage />);
  await waitOnline();
  expect(screen.getByText('管理员')).toBeInTheDocument();
  expect(screen.getAllByText('在线').length).toBeGreaterThan(0);
  expect(screen.getByText('用户名或密码错误')).toBeInTheDocument();
});

it('筛选：输入关键字查询，调用带 keyword', async () => {
  render(<LoginLogPage />);
  await waitOnline();
  const input = screen.getByPlaceholderText('姓名/用户名');
  fireEvent.change(input, { target: { value: 'admin' } });
  fireEvent.click(screen.getByRole('button', { name: /查\s*询/ }));
  await waitFor(() => {
    const calls = m.fetchLoginLogs.mock.calls;
    expect(calls[calls.length - 1][0].keyword).toBe('admin');
  });
});

it('强制下线：Popconfirm 确认后调用 forceUserLogout', async () => {
  render(<LoginLogPage />);
  await waitOnline();
  fireEvent.click(screen.getByRole('button', { name: /强制下线/ }));
  const confirm = await screen.findByText('确认强制该用户全部会话下线？');
  expect(confirm).toBeInTheDocument();
  // 点击 Popconfirm 弹出层中的确定按钮
  const popover = confirm.closest('.ant-popover') as HTMLElement;
  fireEvent.click(within(popover).getByRole('button', { name: /确\s*定/ }));
  await waitFor(() => expect(m.forceUserLogout).toHaveBeenCalledWith('u1'));
});

it('详情：离线失败记录点击详情打开抽屉', async () => {
  render(<LoginLogPage />);
  await waitOnline();
  fireEvent.click(screen.getByRole('button', { name: /详\s*情/ }));
  const drawer = await screen.findByRole('dialog');
  // 用户行 realName 为空时回退 username，整段文本为 "unknown（unknown）"
  expect(within(drawer).getByText('unknown（unknown）')).toBeInTheDocument();
});

it('详情：成功但已离线记录（会话过期）抽屉展示成功标签', async () => {
  // 在线记录只显示「强制下线」；离线记录才显示「详情」。
  // 构造一条 success=true 但 online=false 的记录（登录后会话已过期）。
  m.fetchLoginLogs.mockResolvedValue(
    paged([logItem({ online: false })]),
  );
  render(<LoginLogPage />);
  await waitOnline();
  fireEvent.click(screen.getByRole('button', { name: /详\s*情/ }));
  const drawer = await screen.findByRole('dialog');
  expect(within(drawer).getByText('成功')).toBeInTheDocument();
});

it('重置：点击重置清空关键字并重新加载', async () => {
  render(<LoginLogPage />);
  await waitOnline();
  const input = screen.getByPlaceholderText('姓名/用户名');
  fireEvent.change(input, { target: { value: 'admin' } });
  fireEvent.click(screen.getByRole('button', { name: /重\s*置/ }));
  await waitFor(() => expect(input).toHaveValue(''));
  const calls = m.fetchLoginLogs.mock.calls;
  const last = calls[calls.length - 1][0];
  expect(last.keyword).toBeUndefined();
});

it('分页：点击下一页触发 setFilter 带 page', async () => {
  m.fetchLoginLogs.mockResolvedValue(
    paged(Array.from({ length: 13 }, (_, i) => logItem({ id: i + 1 }))),
  );
  render(<LoginLogPage />);
  await waitOnline();
  fireEvent.click(screen.getByTitle('下一页'));
  await waitFor(() => {
    const calls = m.fetchLoginLogs.mock.calls;
    expect(calls[calls.length - 1][0].page).toBe(2);
  });
});

it('断库恢复：点击 Alert 内刷新，探活成功后重新加载', async () => {
  vi.mocked(getSystemHealth).mockResolvedValue({
    status: 'degraded',
    version: '0.8.0',
    demoMode: false,
    db: 'down',
  });
  render(<LoginLogPage />);
  const alert = await screen.findByTestId('loginlog-offline-alert');
  vi.mocked(getSystemHealth).mockResolvedValue({
    status: 'ok',
    version: '0.8.0',
    demoMode: false,
    db: 'up',
  });
  const before = m.fetchLoginLogs.mock.calls.length;
  fireEvent.click(within(alert).getByRole('button', { name: /刷\s*新/ }));
  await waitFor(() => expect(m.fetchLoginLogs.mock.calls.length).toBeGreaterThan(before));
});

it('断库：渲染离线 Alert', async () => {
  vi.mocked(getSystemHealth).mockResolvedValue({
    status: 'degraded',
    version: '0.8.0',
    demoMode: false,
    db: 'down',
  });
  render(<LoginLogPage />);
  expect(await screen.findByTestId('loginlog-offline-alert')).toBeInTheDocument();
  expect(screen.queryByTestId('loginlog-content')).not.toBeInTheDocument();
});
