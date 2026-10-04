/* ============================================================================
 * 健澜科技杠OS - 角色管理页面测试（M8-B）
 *
 * 覆盖：
 *  - 在线：角色表格渲染（名称/编码/类型/权限数/用户数）；
 *  - 新增：弹窗填写并提交；
 *  - 编辑：弹窗回填；
 *  - 分配权限：弹窗权限树勾选并保存；
 *  - 查看：角色详情抽屉（权限 + 关联用户）；
 *  - 删除：自定义角色 Popconfirm；
 *  - 断库：显式离线 Alert，不渲染业务内容。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/
import { it as vitestIt, expect, beforeEach, vi } from 'vitest';
import type { TestFunction } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@test-utils';

const it = (name: string, fn: TestFunction) => vitestIt(name, fn, 60000);

import RoleManagementPage from '@/pages/RoleManagementPage';
import type {
  AdminPermissionGroup,
  AdminRole,
  AdminRoleDetail,
} from '@/types/adminRole';

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
    code: 'doctor',
    name: '医生',
    description: '系统医生',
    isSystem: true,
    permissionCodes: ['medical_record:write'],
    userCount: 3,
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

function detail(over: Partial<AdminRoleDetail> = {}): AdminRoleDetail {
  return { role: role(), users: [], ...over };
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
  m.fetchAdminRoles.mockResolvedValue([
    role(),
    role({ code: 'custom', name: '自定义角色', isSystem: false, userCount: 0 }),
  ]);
  m.fetchAdminPermissions.mockResolvedValue([permGroup()]);
  m.fetchAdminRoleDetail.mockResolvedValue(detail());
  m.createAdminRole.mockResolvedValue(role());
  m.updateAdminRole.mockResolvedValue(role());
  m.assignAdminRolePermissions.mockResolvedValue(role());
  m.deleteAdminRole.mockResolvedValue({ deleted: true });
});

async function waitOnline() {
  return screen.findByTestId('role-content');
}

it('在线：渲染角色表格（名称/编码/类型/用户数）', async () => {
  render(<RoleManagementPage />);
  await waitOnline();
  expect(screen.getByText('医生')).toBeInTheDocument();
  expect(screen.getByText('doctor')).toBeInTheDocument();
  expect(screen.getByText('自定义角色')).toBeInTheDocument();
});

it('在线：系统角色与自定义角色类型标签正确', async () => {
  render(<RoleManagementPage />);
  await waitOnline();
  const tags = screen.getAllByText('系统内置');
  expect(tags.length).toBeGreaterThan(0);
  expect(screen.getByText('自定义')).toBeInTheDocument();
});

it('新增：打开弹窗，填写后提交调用 createAdminRole', async () => {
  render(<RoleManagementPage />);
  await waitOnline();
  fireEvent.click(screen.getByRole('button', { name: /新\s*增\s*角\s*色/ }));
  const dialog = await screen.findByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText('角色编码'), {
    target: { value: 'new_custom' },
  });
  fireEvent.change(within(dialog).getByLabelText('角色名称'), {
    target: { value: '新角色' },
  });
  fireEvent.click(within(dialog).getByRole('button', { name: '保 存' }));
  await waitFor(() =>
    expect(m.createAdminRole).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'new_custom', name: '新角色' }),
    ),
  );
});

it('编辑：弹窗回填目标角色，编码禁用', async () => {
  render(<RoleManagementPage />);
  await waitOnline();
  fireEvent.click(screen.getAllByRole('button', { name: /编\s*辑/ })[0]);
  const dialog = await screen.findByRole('dialog');
  expect(within(dialog).getByDisplayValue('doctor')).toBeDisabled();
  expect(within(dialog).getByDisplayValue('医生')).toBeInTheDocument();
});

it('分配权限：打开权限树，勾选并保存', async () => {
  render(<RoleManagementPage />);
  await waitOnline();
  fireEvent.click(screen.getAllByRole('button', { name: /分\s*配\s*权\s*限/ })[0]);
  const dialog = await screen.findByRole('dialog');
  // 勾选权限树中的权限点
  const checkbox = within(dialog).getByText('审计查看（system:audit:view）');
  fireEvent.click(checkbox);
  fireEvent.click(within(dialog).getByRole('button', { name: '保 存' }));
  await waitFor(() => expect(m.assignAdminRolePermissions).toHaveBeenCalled());
});

it('查看：打开角色详情抽屉，显示权限与关联用户', async () => {
  m.fetchAdminRoleDetail.mockResolvedValue(
    detail({
      users: [
        {
          id: 'u-1',
          username: 'doctor_li',
          realName: '李医生',
          department: '内科',
          status: 'active',
        },
      ],
    }),
  );
  render(<RoleManagementPage />);
  await waitOnline();
  fireEvent.click(screen.getAllByRole('button', { name: /查\s*看/ })[0]);
  const drawer = await screen.findByRole('dialog');
  expect(within(drawer).getByText('medical_record:write')).toBeInTheDocument();
  expect(within(drawer).getByText('李医生')).toBeInTheDocument();
});

it('查看：权限数为 0 的角色详情显示「暂无权限」', async () => {
  const empty = role({ code: 'empty', name: '空权限角色', permissionCodes: [], userCount: 0 });
  m.fetchAdminRoles.mockResolvedValue([empty]);
  m.fetchAdminRoleDetail.mockResolvedValue(detail({ role: empty }));
  render(<RoleManagementPage />);
  await waitOnline();
  fireEvent.click(screen.getByRole('button', { name: /查\s*看/ }));
  const drawer = await screen.findByRole('dialog');
  expect(within(drawer).getByText('暂无权限')).toBeInTheDocument();
});

it('删除：自定义角色 Popconfirm 确认后调用', async () => {
  render(<RoleManagementPage />);
  await waitOnline();
  fireEvent.click(screen.getByRole('button', { name: /删\s*除/ }));
  const popover = await screen.findByRole('tooltip');
  fireEvent.click(within(popover).getByRole('button', { name: /删\s*除/ }));
  await waitFor(() => expect(m.deleteAdminRole).toHaveBeenCalledWith('custom'));
});

it('断库：显式离线 Alert，刷新按钮可触发重新探活', async () => {
  healthMock.mockResolvedValue({
    status: 'ok',
    version: '0.8.0',
    demoMode: false,
    db: 'down',
  });
  render(<RoleManagementPage />);
  const alert = await screen.findByTestId('role-offline-alert');
  expect(alert).toBeInTheDocument();
  expect(screen.queryByTestId('role-content')).toBeNull();
  // 点击刷新，再次触发 checkHealth（仍为 down），覆盖断库刷新回调
  fireEvent.click(within(alert).getByRole('button', { name: /刷\s*新/ }));
  await waitFor(() => expect(healthMock).toHaveBeenCalledTimes(2));
});
