/* ============================================================================
 * 健澜科技杠OS - 权限管理页面测试（M8-B）
 *
 * 覆盖：
 *  - 在线：权限目录树（按模块分组）；
 *  - 角色-权限矩阵：切换 Tab 后渲染矩阵（角色列、勾选标记）；
 *  - 断库：显式离线 Alert，不渲染业务内容。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/
import { it as vitestIt, expect, beforeEach, vi } from 'vitest';
import type { TestFunction } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@test-utils';

const it = (name: string, fn: TestFunction) => vitestIt(name, fn, 60000);

import PermissionManagementPage from '@/pages/PermissionManagementPage';
import type { AdminPermissionGroup, AdminRole } from '@/types/adminRole';

vi.mock('@/services/api/adminRole', () => ({
  fetchAdminRoles: vi.fn(),
  fetchAdminRoleDetail: vi.fn(),
  fetchAdminPermissions: vi.fn(),
  createAdminRole: vi.fn(),
  updateAdminRole: vi.fn(),
  assignAdminRolePermissions: vi.fn(),
  deleteAdminRole: vi.fn(),
}));
vi.mock('@/services/api/pharmacy', () => ({ getSystemHealth: vi.fn() }));

import * as api from '@/services/api/adminRole';
import { getSystemHealth } from '@/services/api/pharmacy';

const m = api as unknown as Record<string, ReturnType<typeof vi.fn>>;
const healthMock = vi.mocked(getSystemHealth);

function role(over: Partial<AdminRole> = {}): AdminRole {
  return {
    code: 'admin',
    name: '管理员',
    description: '系统管理员',
    isSystem: true,
    permissionCodes: ['system:audit:view'],
    userCount: 1,
    createdAt: '2026-01-01T00:00:00Z',
    ...over,
  };
}

function permGroup(over: Partial<AdminPermissionGroup> = {}): AdminPermissionGroup {
  return {
    module: 'system',
    count: 1,
    permissions: [
      { code: 'system:audit:view', name: '审计查看', module: 'system', description: null },
    ],
    ...over,
  };
}

function healthUp() {
  healthMock.mockResolvedValue({
    status: 'ok',
    version: '0.8.0',
    demoMode: false,
    db: 'up',
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  healthUp();
  m.fetchAdminRoles.mockResolvedValue([role()]);
  m.fetchAdminPermissions.mockResolvedValue([permGroup()]);
});

async function waitOnline() {
  return screen.findByTestId('perm-content');
}

it('在线：权限目录树按模块分组渲染', async () => {
  render(<PermissionManagementPage />);
  await waitOnline();
  // 权限目录异步加载，用 findByText 等待模块节点与权限点
  expect(await screen.findByText('system（1）')).toBeInTheDocument();
  expect(await screen.findByText('审计查看')).toBeInTheDocument();
});

it('矩阵：切换到角色-权限矩阵，渲染角色列、勾选与无权限标记', async () => {
  // 两个角色：admin 有权限、nurse 无权限，覆盖 ✓ 与 — 两种单元格
  m.fetchAdminRoles.mockResolvedValue([
    role(),
    role({ code: 'nurse', name: '护士', permissionCodes: [], userCount: 0 }),
  ]);
  render(<PermissionManagementPage />);
  await waitOnline();
  fireEvent.click(screen.getByRole('tab', { name: '角色-权限矩阵' }));
  // 矩阵表格用 testid 定位（固定列会产生多个 table），在表格内断言避免重复
  const table = screen.getByTestId('perm-matrix-table');
  expect(within(table).getByRole('columnheader', { name: '管理员' })).toBeInTheDocument();
  expect(within(table).getByRole('columnheader', { name: '护士' })).toBeInTheDocument();
  expect(within(table).getByText('system:audit:view')).toBeInTheDocument();
  expect(within(table).getByText('✓')).toBeInTheDocument();
  expect(within(table).getByText('—')).toBeInTheDocument();
});

it('断库：显式离线 Alert，刷新按钮可触发重新探活', async () => {
  healthMock.mockResolvedValue({
    status: 'ok',
    version: '0.8.0',
    demoMode: false,
    db: 'down',
  });
  render(<PermissionManagementPage />);
  const alert = await screen.findByTestId('perm-offline-alert');
  expect(alert).toBeInTheDocument();
  expect(screen.queryByTestId('perm-content')).toBeNull();
  // 点击刷新，再次触发 checkHealth（仍为 down），覆盖断库刷新回调
  fireEvent.click(within(alert).getByRole('button', { name: /刷\s*新/ }));
  await waitFor(() => expect(healthMock).toHaveBeenCalledTimes(2));
});
