/* ============================================================================
 * 健澜科技杠OS - 会话管理状态（M7-F）
 *
 * 真实 BFF：在线会话列表、按 jti/user_id 强制下线。
 * 健康门禁：BFF/DB 不可用时阻断写操作并显式报错，绝不以假数据冒充。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/

import { create } from 'zustand';
import * as sessionApi from '@/services/api/session';
import { getSystemHealth } from '@/services/api/pharmacy';
import type { ActiveSession } from '@/types/session';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

interface SessionAdminState {
  dbUp: boolean;
  healthChecking: boolean;
  sessions: ActiveSession[];
  loading: boolean;
  acting: boolean;
  error: string | null;

  checkHealth: () => Promise<boolean>;
  loadSessions: (userId?: string) => Promise<void>;
  revokeByJti: (jti: string) => Promise<boolean>;
  forceOffline: (userId: string) => Promise<boolean>;
  clearError: () => void;
}

export const useSessionAdminStore = create<SessionAdminState>((set, get) => ({
  dbUp: false,
  healthChecking: false,
  sessions: [],
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

  loadSessions: async (userId?: string) => {
    set({ loading: true, error: null });
    try {
      const sessions = await sessionApi.fetchActiveSessions(userId);
      set({ sessions, loading: false });
    } catch (e) {
      set({ loading: false, error: `加载在线会话失败：${errMsg(e)}` });
    }
  },

  revokeByJti: async (jti: string) => {
    set({ acting: true, error: null });
    try {
      await sessionApi.revokeSessionByJti(jti);
      set({ acting: false });
      await get().loadSessions();
      return true;
    } catch (e) {
      set({ acting: false, error: `强制下线失败：${errMsg(e)}` });
      return false;
    }
  },

  forceOffline: async (userId: string) => {
    set({ acting: true, error: null });
    try {
      await sessionApi.forceUserOffline(userId);
      set({ acting: false });
      await get().loadSessions();
      return true;
    } catch (e) {
      set({ acting: false, error: `强制下线失败：${errMsg(e)}` });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
