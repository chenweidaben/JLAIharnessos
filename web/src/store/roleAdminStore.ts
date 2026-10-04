/* ============================================================================
 * 健澜科技杠OS - 角色与权限管理状态（M8-B）
 *
 * 真实 BFF：角色列表/详情、权限目录（只读）、新建/编辑/删除自定义角色、
 * 为角色分配权限。
 * 健康门禁：BFF/DB 不可用时阻断写操作并显式报错，绝不以假数据冒充。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/

import { create } from 'zustand';
import * as adminRoleApi from '@/services/api/adminRole';
import { getSystemHealth } from '@/services/api/pharmacy';
import type {
  AdminPermissionGroup,
  AdminRole,
  AdminRoleDetail,
  CreateAdminRoleInput,
  UpdateAdminRoleInput,
} from '@/types/adminRole';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

interface RoleAdminState {
  dbUp: boolean;
  healthChecking: boolean;
  roles: AdminRole[];
  permissionGroups: AdminPermissionGroup[];
  selected: AdminRoleDetail | null;
  loading: boolean;
  acting: boolean;
  error: string | null;

  checkHealth: () => Promise<boolean>;
  loadRoles: () => Promise<void>;
  loadPermissions: () => Promise<void>;
  openRole: (code: string) => Promise<void>;
  clearSelected: () => void;

  createRole: (payload: CreateAdminRoleInput) => Promise<boolean>;
  updateRole: (code: string, payload: UpdateAdminRoleInput) => Promise<boolean>;
  assignPermissions: (code: string, permissionCodes: string[]) => Promise<boolean>;
  deleteRole: (code: string) => Promise<boolean>;
  clearError: () => void;
}

export const useRoleAdminStore = create<RoleAdminState>((set, get) => ({
  dbUp: false,
  healthChecking: false,
  roles: [],
  permissionGroups: [],
  selected: null,
  loading: false,
  acting: false,
  error: null,

  checkHealth: async () => {
    set({ healthChecking: true });
    try {
      const health = await getSystemHealth();
      const dbUp = health.db === 'up';
      set({ dbUp, healthChecking: false, error: null });
      return dbUp;
    } catch (e) {
      set({
        dbUp: false,
        healthChecking: false,
        error: `BFF/数据库连接失败：${errMsg(e)}`,
      });
      return false;
    }
  },

  loadRoles: async () => {
    set({ loading: true, error: null });
    try {
      const roles = await adminRoleApi.fetchAdminRoles();
      set({ roles, loading: false });
    } catch (e) {
      set({ loading: false, error: `加载角色列表失败：${errMsg(e)}` });
    }
  },

  loadPermissions: async () => {
    set({ loading: true, error: null });
    try {
      const permissionGroups = await adminRoleApi.fetchAdminPermissions();
      set({ permissionGroups, loading: false });
    } catch (e) {
      set({ loading: false, error: `加载权限目录失败：${errMsg(e)}` });
    }
  },

  openRole: async (code) => {
    set({ loading: true, error: null });
    try {
      const selected = await adminRoleApi.fetchAdminRoleDetail(code);
      set({ selected, loading: false });
    } catch (e) {
      set({ loading: false, error: `加载角色详情失败：${errMsg(e)}` });
    }
  },

  clearSelected: () => set({ selected: null }),

  createRole: async (payload) => {
    set({ acting: true, error: null });
    try {
      await adminRoleApi.createAdminRole(payload);
      set({ acting: false });
      await get().loadRoles();
      return true;
    } catch (e) {
      set({ acting: false, error: `创建角色失败：${errMsg(e)}` });
      return false;
    }
  },

  updateRole: async (code, payload) => {
    set({ acting: true, error: null });
    try {
      await adminRoleApi.updateAdminRole(code, payload);
      set({ acting: false });
      await get().loadRoles();
      return true;
    } catch (e) {
      set({ acting: false, error: `更新角色失败：${errMsg(e)}` });
      return false;
    }
  },

  assignPermissions: async (code, permissionCodes) => {
    set({ acting: true, error: null });
    try {
      await adminRoleApi.assignAdminRolePermissions(code, permissionCodes);
      set({ acting: false });
      await get().loadRoles();
      if (get().selected?.role.code === code) {
        await get().openRole(code);
      }
      return true;
    } catch (e) {
      set({ acting: false, error: `分配权限失败：${errMsg(e)}` });
      return false;
    }
  },

  deleteRole: async (code) => {
    set({ acting: true, error: null });
    try {
      await adminRoleApi.deleteAdminRole(code);
      set({ acting: false, selected: null });
      await get().loadRoles();
      return true;
    } catch (e) {
      set({ acting: false, error: `删除角色失败：${errMsg(e)}` });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
