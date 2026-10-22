/**
 * 健澜科技 jlmedaios - 角色权限管理 Zustand store（M744）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchSystemRoles,
  type SystemRole,
} from '@/services/api/systemRoleM744';

interface SystemRoleM744State {
  items: SystemRole[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useSystemRoleM744Store = create<SystemRoleM744State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchSystemRoles();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '角色加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
