/* ============================================================================
 * 健澜科技杠OS - 角色与权限管理 store 单测（M8-B）
 *
 * 覆盖：健康门禁、角色列表/权限目录加载、角色详情、新建/编辑/分配权限/
 * 删除、错误分支、清错。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useRoleAdminStore } from '@/store/roleAdminStore';
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

import {
  fetchAdminRoles,
  fetchAdminRoleDetail,
  fetchAdminPermissions,
  createAdminRole,
  updateAdminRole,
  assignAdminRolePermissions,
  deleteAdminRole,
} from '@/services/api/adminRole';
import { getSystemHealth } from '@/services/api/pharmacy';

function r(over: Partial<AdminRole> = {}): AdminRole {
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

function g(over: Partial<AdminPermissionGroup> = {}): AdminPermissionGroup {
  return {
    module: 'system',
    count: 1,
    permissions: [{ code: 'system:audit:view', name: '审计查看', module: 'system', description: null }],
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  useRoleAdminStore.setState({
    dbUp: false,
    healthChecking: false,
    roles: [],
    permissionGroups: [],
    selected: null,
    loading: false,
    acting: false,
    error: null,
  });
  vi.mocked(getSystemHealth).mockResolvedValue({
    status: 'ok',
    version: '0.8.0',
    demoMode: false,
    db: 'up',
  });
  vi.mocked(fetchAdminRoles).mockResolvedValue([r()]);
  vi.mocked(fetchAdminPermissions).mockResolvedValue([g()]);
  vi.mocked(fetchAdminRoleDetail).mockResolvedValue({ role: r(), users: [] });
  vi.mocked(createAdminRole).mockResolvedValue(r({ code: 'custom', isSystem: false }));
  vi.mocked(updateAdminRole).mockResolvedValue(r({ name: '新名' }));
  vi.mocked(assignAdminRolePermissions).mockResolvedValue(r({ permissionCodes: ['a:b'] }));
  vi.mocked(deleteAdminRole).mockResolvedValue({ deleted: true });
});

describe('roleAdminStore', () => {
  it('checkHealth：db up 返回 true', async () => {
    const up = await useRoleAdminStore.getState().checkHealth();
    expect(up).toBe(true);
    expect(useRoleAdminStore.getState().dbUp).toBe(true);
  });

  it('checkHealth：db down 返回 false', async () => {
    vi.mocked(getSystemHealth).mockResolvedValue({
      status: 'ok',
      version: '0.8.0',
      demoMode: false,
      db: 'down',
    });
    const up = await useRoleAdminStore.getState().checkHealth();
    expect(up).toBe(false);
  });

  it('checkHealth：探活抛错返回 false 并写 error', async () => {
    vi.mocked(getSystemHealth).mockRejectedValueOnce(new Error('network down'));
    const up = await useRoleAdminStore.getState().checkHealth();
    expect(up).toBe(false);
    expect(useRoleAdminStore.getState().error).toContain('network down');
  });

  it('loadRoles：拉取角色并写入', async () => {
    await useRoleAdminStore.getState().loadRoles();
    expect(useRoleAdminStore.getState().roles).toHaveLength(1);
    expect(fetchAdminRoles).toHaveBeenCalled();
  });

  it('loadRoles：失败写 error 且不抛', async () => {
    vi.mocked(fetchAdminRoles).mockRejectedValueOnce(new Error('refused'));
    await useRoleAdminStore.getState().loadRoles();
    expect(useRoleAdminStore.getState().error).toContain('refused');
  });

  it('loadPermissions：拉取权限分组并写入', async () => {
    await useRoleAdminStore.getState().loadPermissions();
    expect(useRoleAdminStore.getState().permissionGroups).toHaveLength(1);
  });

  it('loadPermissions：失败写 error', async () => {
    vi.mocked(fetchAdminPermissions).mockRejectedValueOnce(new Error('no perms'));
    await useRoleAdminStore.getState().loadPermissions();
    expect(useRoleAdminStore.getState().error).toContain('no perms');
  });

  it('openRole：拉取详情并写入 selected', async () => {
    await useRoleAdminStore.getState().openRole('doctor');
    expect(useRoleAdminStore.getState().selected?.role.code).toBe('doctor');
    expect(fetchAdminRoleDetail).toHaveBeenCalledWith('doctor');
  });

  it('openRole：失败写 error', async () => {
    vi.mocked(fetchAdminRoleDetail).mockRejectedValueOnce(new Error('missing'));
    await useRoleAdminStore.getState().openRole('nope');
    expect(useRoleAdminStore.getState().error).toContain('missing');
  });

  it('clearSelected：清空 selected', () => {
    useRoleAdminStore.setState({ selected: { role: r(), users: [] } });
    useRoleAdminStore.getState().clearSelected();
    expect(useRoleAdminStore.getState().selected).toBeNull();
  });

  it('createRole：成功后刷新并返回 true', async () => {
    const ok = await useRoleAdminStore.getState().createRole({
      code: 'custom',
      name: '自定义',
    });
    expect(ok).toBe(true);
    expect(createAdminRole).toHaveBeenCalled();
    expect(fetchAdminRoles).toHaveBeenCalled();
  });

  it('createRole：失败返回 false 并写 error', async () => {
    vi.mocked(createAdminRole).mockRejectedValueOnce(new Error('duplicate'));
    const ok = await useRoleAdminStore.getState().createRole({ code: 'x', name: 'x' });
    expect(ok).toBe(false);
    expect(useRoleAdminStore.getState().error).toContain('duplicate');
  });

  it('updateRole：成功后刷新并返回 true', async () => {
    const ok = await useRoleAdminStore.getState().updateRole('doctor', { name: '新名' });
    expect(ok).toBe(true);
    expect(updateAdminRole).toHaveBeenCalledWith('doctor', { name: '新名' });
  });

  it('assignPermissions：成功后刷新角色并返回 true', async () => {
    const ok = await useRoleAdminStore.getState().assignPermissions('doctor', ['a:b']);
    expect(ok).toBe(true);
    expect(assignAdminRolePermissions).toHaveBeenCalledWith('doctor', ['a:b']);
  });

  it('assignPermissions：失败返回 false 并写 error', async () => {
    vi.mocked(assignAdminRolePermissions).mockRejectedValueOnce(new Error('bad code'));
    const ok = await useRoleAdminStore.getState().assignPermissions('doctor', ['x']);
    expect(ok).toBe(false);
    expect(useRoleAdminStore.getState().error).toContain('bad code');
  });

  it('deleteRole：成功后清 selected、刷新并返回 true', async () => {
    useRoleAdminStore.setState({ selected: { role: r(), users: [] } });
    const ok = await useRoleAdminStore.getState().deleteRole('doctor');
    expect(ok).toBe(true);
    expect(useRoleAdminStore.getState().selected).toBeNull();
    expect(deleteAdminRole).toHaveBeenCalledWith('doctor');
  });

  it('deleteRole：失败返回 false 并写 error', async () => {
    vi.mocked(deleteAdminRole).mockRejectedValueOnce(new Error('denied'));
    const ok = await useRoleAdminStore.getState().deleteRole('doctor');
    expect(ok).toBe(false);
    expect(useRoleAdminStore.getState().error).toContain('denied');
  });

  it('clearError：清空错误', async () => {
    vi.mocked(fetchAdminRoles).mockRejectedValueOnce(new Error('x'));
    await useRoleAdminStore.getState().loadRoles();
    expect(useRoleAdminStore.getState().error).not.toBeNull();
    useRoleAdminStore.getState().clearError();
    expect(useRoleAdminStore.getState().error).toBeNull();
  });
});
