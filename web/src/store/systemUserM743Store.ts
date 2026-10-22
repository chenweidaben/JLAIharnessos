/**
 * 健澜科技 jlmedaios - 用户管理 Zustand store（M743）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchSystemUsers,
  type SystemUser,
} from '@/services/api/systemUserM743';

interface SystemUserM743State {
  items: SystemUser[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useSystemUserM743Store = create<SystemUserM743State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchSystemUsers();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '用户加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
