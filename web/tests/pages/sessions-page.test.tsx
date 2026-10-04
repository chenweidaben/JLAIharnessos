/* ============================================================================
 * 健澜科技杠OS - 会话管理页面测试（M7-F）
 *
 * 覆盖：
 *  - 在线：会话表格渲染（用户/时间/IP/终端）、按用户查询、刷新；
 *  - 强制下线：Popconfirm 确认调用吊销；
 *  - 断库：显式离线 Alert，不渲染业务内容。
 *
 * BFF 经 vi.mock 隔离；真实断库/HTTP 另有端到端取证。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/
import { it as vitestIt, expect, beforeEach, vi } from 'vitest';
import type { TestFunction } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@test-utils';

// 重型页面（健康门禁 + 异步渲染）：提至 30s 避免计时抖动。
const it = (name: string, fn: TestFunction) =>
  vitestIt(name, fn, 60000);

import SessionsPage from '@/pages/sessions';
import type { ActiveSession } from '@/types/session';

vi.mock('@/services/api/session', () => ({
  fetchActiveSessions: vi.fn(),
  revokeSessionByJti: vi.fn(),
  forceUserOffline: vi.fn(),
}));
vi.mock('@/services/api/pharmacy', () => ({ getSystemHealth: vi.fn() }));

import * as api from '@/services/api/session';
import { getSystemHealth } from '@/services/api/pharmacy';

const m = api as unknown as Record<string, ReturnType<typeof vi.fn>>;
const healthMock = vi.mocked(getSystemHealth);

function session(over: Partial<ActiveSession> = {}): ActiveSession {
  return {
    jti: 'jti-1',
    userId: 'user-1001',
    issuedAt: '2026-10-03T08:00:00Z',
    accessExpiresAt: '2026-10-03T10:00:00Z',
    ip: '192.168.1.10',
    userAgent: 'Mozilla/5.0 Chrome/120',
    ...over,
  };
}

function healthUp() {
  healthMock.mockResolvedValue({
    status: 'ok',
    version: '0.7.0',
    demoMode: false,
    db: 'up',
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  healthUp();
  m.fetchActiveSessions.mockResolvedValue([session()]);
  m.revokeSessionByJti.mockResolvedValue({ revoked: 1 });
  m.forceUserOffline.mockResolvedValue({ revoked: 1 });
});

async function waitOnline() {
  return screen.findByTestId('session-content');
}

it('在线：渲染会话表格（用户/时间/IP/终端）', async () => {
  render(<SessionsPage />);
  await waitOnline();
  expect(screen.getByText('user-1001')).toBeInTheDocument();
  expect(screen.getByText('192.168.1.10')).toBeInTheDocument();
  expect(screen.getByText('Mozilla/5.0 Chrome/120')).toBeInTheDocument();
});

it('查询：输入用户 ID 后点击查询，带参调用 fetchActiveSessions', async () => {
  render(<SessionsPage />);
  await waitOnline();
  const input = screen.getByPlaceholderText('按用户 ID 筛选');
  fireEvent.change(input, { target: { value: 'user-2002' } });
  fireEvent.click(screen.getByRole('button', { name: /查\s*询/ }));
  await waitFor(() =>
    expect(m.fetchActiveSessions).toHaveBeenLastCalledWith('user-2002'),
  );
});

it('查询：回车同样触发带参查询', async () => {
  render(<SessionsPage />);
  await waitOnline();
  const input = screen.getByPlaceholderText('按用户 ID 筛选');
  fireEvent.change(input, { target: { value: 'user-2002' } });
  fireEvent.keyDown(input, { key: 'Enter', keyCode: 13 });
  await waitFor(() =>
    expect(m.fetchActiveSessions).toHaveBeenLastCalledWith('user-2002'),
  );
});

it('刷新：点击刷新重新探活并加载', async () => {
  render(<SessionsPage />);
  await waitOnline();
  const before = m.fetchActiveSessions.mock.calls.length;
  fireEvent.click(screen.getByRole('button', { name: /刷\s*新/ }));
  await waitFor(() =>
    expect(m.fetchActiveSessions.mock.calls.length).toBeGreaterThan(before),
  );
});

it('强制下线：Popconfirm 确认后调用吊销', async () => {
  render(<SessionsPage />);
  await waitOnline();
  // 表格行内的"强制下线"按钮（Popconfirm 触发器）
  fireEvent.click(screen.getByRole('button', { name: /强\s*制\s*下\s*线/ }));
  const popover = await screen.findByRole('tooltip');
  fireEvent.click(within(popover).getByRole('button', { name: /吊\s*销/ }));
  await waitFor(() =>
    expect(m.revokeSessionByJti).toHaveBeenCalledWith('jti-1'),
  );
});

it('断库：显式离线 Alert，不渲染业务内容', async () => {
  healthMock.mockResolvedValue({
    status: 'ok',
    version: '0.7.0',
    demoMode: false,
    db: 'down',
  });
  render(<SessionsPage />);
  expect(await screen.findByTestId('session-offline-alert')).toBeInTheDocument();
  expect(screen.queryByTestId('session-content')).toBeNull();
  expect(screen.getByTestId('session-health-tag')).toHaveTextContent(
    'BFF/DB 不可用',
  );
});
