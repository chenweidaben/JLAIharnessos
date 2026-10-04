/* ============================================================================
 * 健澜科技杠OS - 用户管理状态（M8-A）
 *
 * 真实 BFF：用户列表、新增/编辑、启禁用/休假、重置密码、软删除。
 * 健康门禁：BFF/DB 不可用时阻断写操作并显式报错，绝不以假数据冒充。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/

import { create } from 'zustand';
import * as adminUserApi from '@/services/api/adminUser';
import { getSystemHealth } from '@/services/api/pharmacy';
import type {
  AdminRoleCode,
  AdminUser,
  AdminUserFilter,
  AdminUserStatus,
  CreateAdminUserPayload,
  UpdateAdminUserPayload,
} from '@/types/adminUser';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** 角色字典（与 iam.roles 对齐） */
export const ADMIN_ROLE_OPTIONS: { code: AdminRoleCode; name: string }[] = [
  { code: 'admin', name: '管理员' },
  { code: 'doctor', name: '医生' },
  { code: 'nurse', name: '护士' },
  { code: 'pharmacist', name: '药师' },
  { code: 'technician', name: '技师' },
  { code: 'researcher', name: '科研人员' },
  { code: 'patient', name: '患者' },
];

interface UserAdminState {
  dbUp: boolean;
  healthChecking: boolean;
  users: AdminUser[];
  total: number;
  loading: boolean;
  acting: boolean;
  error: string | null;

  filter: AdminUserFilter;
  page: number;
  pageSize: number;

  checkHealth: () => Promise<boolean>;
  loadUsers: () => Promise<void>;
  setFilter: (patch: Partial<AdminUserFilter>) => void;
  setPage: (page: number) => void;

  createUser: (payload: CreateAdminUserPayload) => Promise<boolean>;
  updateUser: (id: string, payload: UpdateAdminUserPayload) => Promise<boolean>;
  changeStatus: (id: string, status: AdminUserStatus) => Promise<boolean>;
  resetPassword: (id: string, newPassword: string) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;
  clearError: () => void;
}

const PAGE_SIZE = 10;

export const useUserAdminStore = create<UserAdminState>((set, get) => ({
  dbUp: false,
  healthChecking: false,
  users: [],
  total: 0,
  loading: false,
  acting: false,
  error: null,

  filter: {},
  page: 1,
  pageSize: PAGE_SIZE,

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

  loadUsers: async () => {
    const { filter, page, pageSize } = get();
    set({ loading: true, error: null });
    try {
      const result = await adminUserApi.fetchAdminUsers({
        ...filter,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      set({ users: result.items, total: result.total, loading: false });
    } catch (e) {
      set({ loading: false, error: `加载用户列表失败：${errMsg(e)}` });
    }
  },

  setFilter: (patch) => {
    set((s) => ({ filter: { ...s.filter, ...patch }, page: 1 }));
    void get().loadUsers();
  },

  setPage: (page) => {
    set({ page });
    void get().loadUsers();
  },

  createUser: async (payload) => {
    set({ acting: true, error: null });
    try {
      await adminUserApi.createAdminUser(payload);
      set({ acting: false });
      await get().loadUsers();
      return true;
    } catch (e) {
      set({ acting: false, error: `创建用户失败：${errMsg(e)}` });
      return false;
    }
  },

  updateUser: async (id, payload) => {
    set({ acting: true, error: null });
    try {
      await adminUserApi.updateAdminUser(id, payload);
      set({ acting: false });
      await get().loadUsers();
      return true;
    } catch (e) {
      set({ acting: false, error: `更新用户失败：${errMsg(e)}` });
      return false;
    }
  },

  changeStatus: async (id, status) => {
    set({ acting: true, error: null });
    try {
      await adminUserApi.changeAdminUserStatus(id, status);
      set({ acting: false });
      await get().loadUsers();
      return true;
    } catch (e) {
      set({ acting: false, error: `状态变更失败：${errMsg(e)}` });
      return false;
    }
  },

  resetPassword: async (id, newPassword) => {
    set({ acting: true, error: null });
    try {
      await adminUserApi.resetAdminUserPassword(id, newPassword);
      set({ acting: false });
      return true;
    } catch (e) {
      set({ acting: false, error: `重置密码失败：${errMsg(e)}` });
      return false;
    }
  },

  deleteUser: async (id) => {
    set({ acting: true, error: null });
    try {
      await adminUserApi.deleteAdminUser(id);
      set({ acting: false });
      await get().loadUsers();
      return true;
    } catch (e) {
      set({ acting: false, error: `删除用户失败：${errMsg(e)}` });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
