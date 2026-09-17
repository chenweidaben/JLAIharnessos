/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 应用状态：侧边栏折叠 / 主题 / 全局 loading
 */
import { create } from 'zustand';

import { local } from '@/utils/storage';

type ThemeMode = 'light' | 'dark';

interface AppState {
  collapsed: boolean;
  theme: ThemeMode;
  globalLoading: boolean;
  toggleCollapsed: () => void;
  setCollapsed: (v: boolean) => void;
  setTheme: (t: ThemeMode) => void;
  setGlobalLoading: (v: boolean) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  collapsed: local.get('sidebar_collapsed', false),
  theme: local.get<ThemeMode>('theme', 'light'),
  globalLoading: false,

  toggleCollapsed: () =>
    set((state) => {
      const collapsed = !state.collapsed;
      local.set('sidebar_collapsed', collapsed);
      return { collapsed };
    }),

  setCollapsed: (v) => {
    local.set('sidebar_collapsed', v);
    set({ collapsed: v });
  },

  setTheme: (t) => {
    local.set('theme', t);
    set({ theme: t });
  },

  setGlobalLoading: (v) => set({ globalLoading: v }),
}));
