/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 用户状态：登录态 / 用户信息 / 权限
 */
import { create } from 'zustand';

import { tokenStorage } from '@/utils/auth';
import type { UserInfo } from '@/types/user';

interface UserState {
  user: UserInfo | null;
  isLoggedIn: boolean;
  permissions: string[];
  setUser: (user: UserInfo) => void;
  hasPermission: (code: string) => boolean;
  logout: () => void;
}

export const useUserStore = create<UserState>()((set, get) => ({
  user: null,
  isLoggedIn: Boolean(tokenStorage.getAccessToken()),
  permissions: [],

  setUser: (user) => set({ user, isLoggedIn: true, permissions: user.permissions ?? [] }),

  hasPermission: (code) => {
    const { permissions } = get();
    return permissions.includes('*') || permissions.includes(code);
  },

  logout: () => {
    tokenStorage.clear();
    set({ user: null, isLoggedIn: false, permissions: [] });
  },
}));
