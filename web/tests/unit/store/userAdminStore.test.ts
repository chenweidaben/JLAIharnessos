/* ============================================================================
 * 健澜科技杠OS - 用户管理 store 单测（M8-A）
 *
 * 覆盖：健康门禁、列表加载、筛选分页、新增/编辑/状态/重置密码/删除、
 * 错误分支、清错。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useUserAdminStore } from '@/store/userAdminStore';
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

import {
  fetchAdminUsers,
  createAdminUser,
  updateAdminUser,
  changeAdminUserStatus,
  resetAdminUserPassword,
  deleteAdminUser,
} from '@/services/api/adminUser';
import { getSystemHealth } from '@/services/api/pharmacy';

function u(over: Partial<AdminUser> = {}): AdminUser {
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
    lastLoginAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  useUserAdminStore.setState({
    dbUp: false,
    healthChecking: false,
    users: [],
    total: 0,
    loading: false,
    acting: false,
    error: null,
    filter: {},
    page: 1,
  });
  vi.mocked(getSystemHealth).mockResolvedValue({
    status: 'ok',
    version: '0.8.0',
    demoMode: false,
    db: 'up',
  });
  vi.mocked(fetchAdminUsers).mockResolvedValue({ items: [u()], total: 1 });
  vi.mocked(createAdminUser).mockResolvedValue(u());
  vi.mocked(updateAdminUser).mockResolvedValue(u());
  vi.mocked(changeAdminUserStatus).mockResolvedValue(u({ status: 'disabled' }));
  vi.mocked(resetAdminUserPassword).mockResolvedValue({ reset: true });
  vi.mocked(deleteAdminUser).mockResolvedValue({ deleted: true });
});

describe('userAdminStore', () => {
  it('checkHealth：db up 返回 true', async () => {
    const up = await useUserAdminStore.getState().checkHealth();
    expect(up).toBe(true);
    expect(useUserAdminStore.getState().dbUp).toBe(true);
  });

  it('checkHealth：db down 返回 false', async () => {
    vi.mocked(getSystemHealth).mockResolvedValue({
      status: 'ok',
      version: '0.8.0',
      demoMode: false,
      db: 'down',
    });
    const up = await useUserAdminStore.getState().checkHealth();
    expect(up).toBe(false);
  });

  it('checkHealth：探活抛错返回 false 并写 error', async () => {
    vi.mocked(getSystemHealth).mockRejectedValueOnce(new Error('network down'));
    const up = await useUserAdminStore.getState().checkHealth();
    expect(up).toBe(false);
    expect(useUserAdminStore.getState().error).toContain('network down');
  });

  it('loadUsers：拉取列表并写入，带分页参数', async () => {
    await useUserAdminStore.getState().loadUsers();
    expect(useUserAdminStore.getState().users).toHaveLength(1);
    expect(useUserAdminStore.getState().total).toBe(1);
    expect(fetchAdminUsers).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10, offset: 0 }),
    );
  });

  it('loadUsers：失败写 error 且不抛', async () => {
    vi.mocked(fetchAdminUsers).mockRejectedValueOnce(new Error('refused'));
    await useUserAdminStore.getState().loadUsers();
    expect(useUserAdminStore.getState().error).toContain('refused');
  });

  it('setFilter：更新筛选并重置到第 1 页，重新加载', async () => {
    useUserAdminStore.getState().setFilter({ deptCode: '外科' });
    expect(useUserAdminStore.getState().filter.deptCode).toBe('外科');
    expect(useUserAdminStore.getState().page).toBe(1);
    expect(fetchAdminUsers).toHaveBeenCalled();
  });

  it('setPage：翻页并重新加载', async () => {
    useUserAdminStore.getState().setPage(3);
    expect(useUserAdminStore.getState().page).toBe(3);
    expect(fetchAdminUsers).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 20 }),
    );
  });

  it('createUser：成功后刷新并返回 true', async () => {
    const ok = await useUserAdminStore.getState().createUser({
      username: 'new',
      password: 'Pass@123',
      realName: '新人',
      roles: [{ roleCode: 'doctor', dataScope: 'department' }],
    });
    expect(ok).toBe(true);
    expect(createAdminUser).toHaveBeenCalled();
    expect(fetchAdminUsers).toHaveBeenCalled();
  });

  it('createUser：失败返回 false 并写 error', async () => {
    vi.mocked(createAdminUser).mockRejectedValueOnce(new Error('duplicate'));
    const ok = await useUserAdminStore.getState().createUser({
      username: 'new',
      password: 'Pass@123',
      realName: '新人',
      roles: [{ roleCode: 'doctor', dataScope: 'department' }],
    });
    expect(ok).toBe(false);
    expect(useUserAdminStore.getState().error).toContain('duplicate');
  });

  it('updateUser：成功后刷新并返回 true', async () => {
    const ok = await useUserAdminStore.getState().updateUser('u-1', {
      realName: '改名',
    });
    expect(ok).toBe(true);
    expect(updateAdminUser).toHaveBeenCalledWith('u-1', expect.any(Object));
  });

  it('changeStatus：调用状态变更并刷新', async () => {
    const ok = await useUserAdminStore.getState().changeStatus('u-1', 'disabled');
    expect(ok).toBe(true);
    expect(changeAdminUserStatus).toHaveBeenCalledWith('u-1', 'disabled');
  });

  it('resetPassword：成功返回 true', async () => {
    const ok = await useUserAdminStore.getState().resetPassword('u-1', 'New@123');
    expect(ok).toBe(true);
    expect(resetAdminUserPassword).toHaveBeenCalledWith('u-1', 'New@123');
  });

  it('deleteUser：成功后刷新并返回 true', async () => {
    const ok = await useUserAdminStore.getState().deleteUser('u-1');
    expect(ok).toBe(true);
    expect(deleteAdminUser).toHaveBeenCalledWith('u-1');
  });

  it('deleteUser：失败返回 false 并写 error', async () => {
    vi.mocked(deleteAdminUser).mockRejectedValueOnce(new Error('denied'));
    const ok = await useUserAdminStore.getState().deleteUser('u-x');
    expect(ok).toBe(false);
    expect(useUserAdminStore.getState().error).toContain('denied');
  });

  it('clearError：清空错误', async () => {
    vi.mocked(fetchAdminUsers).mockRejectedValueOnce(new Error('x'));
    await useUserAdminStore.getState().loadUsers();
    expect(useUserAdminStore.getState().error).not.toBeNull();
    useUserAdminStore.getState().clearError();
    expect(useUserAdminStore.getState().error).toBeNull();
  });
});
