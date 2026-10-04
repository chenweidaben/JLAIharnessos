/* ============================================================================
 * 健澜科技杠OS - 用户管理页面测试（M8-A）
 *
 * 覆盖：
 *  - 在线：用户表格渲染（姓名/科室/职称/角色/状态）；
 *  - 搜索：关键字 + 科室 + 状态查询、重置；
 *  - 新增：弹窗填写并提交；
 *  - 编辑：弹窗回填；
 *  - 重置密码 / 禁用：Popconfirm 与状态调用；
 *  - 断库：显式离线 Alert，不渲染业务内容。
 *
 * BFF 经 vi.mock 隔离；真实断库/HTTP 另有端到端取证。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/
import { it as vitestIt, expect, beforeEach, vi } from 'vitest';
import type { TestFunction } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@test-utils';

const it = (name: string, fn: TestFunction) => vitestIt(name, fn, 60000);

import UserManagementPage from '@/pages/UserManagementPage';
import type { AdminUser } from '@/types/adminUser';

vi.mock('@/services/api/adminUser', () => ({
  fetchAdminUsers: vi.fn(),
  fetchAdminUser: vi.fn(),
  createAdminUser: vi.fn(),
  updateAdminUser: vi.fn(),
  changeAdminUserStatus: vi.fn(),
  resetAdminUserPassword: vi.fn(),
  deleteAdminUser: vi.fn(),
}));
vi.mock('@/services/api/pharmacy', () => ({ getSystemHealth: vi.fn() }));

import * as api from '@/services/api/adminUser';
import { getSystemHealth } from '@/services/api/pharmacy';

const m = api as unknown as Record<string, ReturnType<typeof vi.fn>>;
const healthMock = vi.mocked(getSystemHealth);

function user(over: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 'u-1',
    username: 'doctor_li',
    realName: '李医生',
    employeeNo: 'EMP001',
    gender: 'male',
    deptCode: '内科',
    title: '主治医师',
    position: null,
    phone: '13800000001',
    email: 'li@test.com',
    status: 'active',
    mfaEnabled: false,
    roleCodes: ['doctor'],
    roleScopes: { doctor: 'department' },
    lastLoginAt: '2026-10-03T08:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
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
  m.fetchAdminUsers.mockResolvedValue({ items: [user()], total: 1 });
  m.createAdminUser.mockResolvedValue(user());
  m.updateAdminUser.mockResolvedValue(user());
  m.changeAdminUserStatus.mockResolvedValue(user({ status: 'disabled' }));
  m.resetAdminUserPassword.mockResolvedValue({ reset: true });
});

async function waitOnline() {
  return screen.findByTestId('user-content');
}

it('在线：渲染用户表格（姓名/科室/职称/角色）', async () => {
  render(<UserManagementPage />);
  await waitOnline();
  expect(screen.getByText('李医生')).toBeInTheDocument();
  expect(screen.getByText('内科')).toBeInTheDocument();
  expect(screen.getByText('主治医师')).toBeInTheDocument();
  expect(screen.getByText('13800000001')).toBeInTheDocument();
});

it('搜索：填写关键字后查询，带 filter 调用', async () => {
  render(<UserManagementPage />);
  await waitOnline();
  fireEvent.change(screen.getByPlaceholderText('姓名 / 用户名 / 工号 / 手机号'), {
    target: { value: '李' },
  });
  fireEvent.click(screen.getByRole('button', { name: /查\s*询/ }));
  await waitFor(() =>
    expect(m.fetchAdminUsers).toHaveBeenLastCalledWith(
      expect.objectContaining({ keyword: '李' }),
    ),
  );
});

it('重置：清空筛选条件并重新查询', async () => {
  render(<UserManagementPage />);
  await waitOnline();
  fireEvent.click(screen.getByTestId('user-search-reset'));
  await waitFor(() =>
    expect(m.fetchAdminUsers).toHaveBeenLastCalledWith(
      expect.objectContaining({
        keyword: undefined,
        deptCode: undefined,
        status: undefined,
      }),
    ),
  );
});

it('新增：打开弹窗，填写后提交调用 createAdminUser', async () => {
  render(<UserManagementPage />);
  await waitOnline();
  fireEvent.click(screen.getByRole('button', { name: /新\s*增\s*用\s*户/ }));
  const dialog = await screen.findByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText('姓名'), {
    target: { value: '新医生' },
  });
  fireEvent.change(within(dialog).getByLabelText('用户名'), {
    target: { value: 'new_doc' },
  });
  fireEvent.change(within(dialog).getByLabelText('初始密码'), {
    target: { value: 'NewPass@123' },
  });
  fireEvent.click(within(dialog).getByRole('button', { name: '保 存' }));
  await waitFor(() => expect(m.createAdminUser).toHaveBeenCalled());
});

it('编辑：弹窗回填目标用户数据', async () => {
  render(<UserManagementPage />);
  await waitOnline();
  fireEvent.click(screen.getByRole('button', { name: /编\s*辑/ }));
  const dialog = await screen.findByRole('dialog');
  await waitFor(() =>
    expect(within(dialog).getByDisplayValue('李医生')).toBeInTheDocument(),
  );
});

it('重置密码：Popconfirm 确认后调用', async () => {
  render(<UserManagementPage />);
  await waitOnline();
  fireEvent.click(screen.getByRole('button', { name: /重\s*置\s*密\s*码/ }));
  const popover = await screen.findByRole('tooltip');
  fireEvent.click(within(popover).getByRole('button', { name: /重\s*置/ }));
  await waitFor(() =>
    expect(m.resetAdminUserPassword).toHaveBeenCalledWith(
      'u-1',
      'Admin@123456',
    ),
  );
});

it('禁用：点击禁用调用 changeAdminUserStatus', async () => {
  render(<UserManagementPage />);
  await waitOnline();
  fireEvent.click(screen.getByRole('button', { name: /禁\s*用/ }));
  await waitFor(() =>
    expect(m.changeAdminUserStatus).toHaveBeenCalledWith('u-1', 'disabled'),
  );
});

it('断库：显式离线 Alert，不渲染业务内容', async () => {
  healthMock.mockResolvedValue({
    status: 'ok',
    version: '0.8.0',
    demoMode: false,
    db: 'down',
  });
  render(<UserManagementPage />);
  expect(await screen.findByTestId('user-offline-alert')).toBeInTheDocument();
  expect(screen.queryByTestId('user-content')).toBeNull();
});
