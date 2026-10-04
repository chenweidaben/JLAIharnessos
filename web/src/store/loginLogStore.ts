/* ============================================================================
 * 健澜科技杠OS - 登录日志查询状态（M8-C）
 *
 * 真实 BFF：登录日志分页/筛选、概览、趋势；对在线用户强制下线。
 * 健康门禁：BFF/DB 不可用时显式报错，绝不以假数据冒充登录日志。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/

import { create } from 'zustand';
import * as adminLogApi from '@/services/api/adminLog';
import { getSystemHealth } from '@/services/api/pharmacy';
import type { LoginDailyTrend, LoginLogItem, LoginOverview } from '@/types/adminLog';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export interface LoginFilterState {
  keyword: string;
  success?: boolean;
  page: number;
  pageSize: number;
}

interface LoginLogState {
  dbUp: boolean;
  healthChecking: boolean;
  items: LoginLogItem[];
  total: number;
  overview: LoginOverview | null;
  trend: LoginDailyTrend[];
  loading: boolean;
  acting: boolean;
  error: string | null;
  filter: LoginFilterState;

  checkHealth: () => Promise<boolean>;
  load: () => Promise<void>;
  setFilter: (patch: Partial<LoginFilterState>) => void;
  forceLogout: (userId: string) => Promise<boolean>;
  clearError: () => void;
}

const initialFilter: LoginFilterState = {
  keyword: '',
  page: 1,
  pageSize: 12,
};

export const useLoginLogStore = create<LoginLogState>((set, get) => ({
  dbUp: false,
  healthChecking: false,
  items: [],
  total: 0,
  overview: null,
  trend: [],
  loading: false,
  acting: false,
  error: null,
  filter: { ...initialFilter },

  checkHealth: async () => {
    set({ healthChecking: true });
    try {
      const health = await getSystemHealth();
      const dbUp = health.db === 'up';
      set({ dbUp, healthChecking: false, error: null });
      return dbUp;
    } catch (e) {
      set({ dbUp: false, healthChecking: false, error: `BFF/数据库连接失败：${errMsg(e)}` });
      return false;
    }
  },

  load: async () => {
    const f = get().filter;
    set({ loading: true, error: null });
    try {
      const [paged, overview, trend] = await Promise.all([
        adminLogApi.fetchLoginLogs({
          keyword: f.keyword || undefined,
          success: f.success,
          page: f.page,
          pageSize: f.pageSize,
        }),
        adminLogApi.fetchLoginOverview(),
        adminLogApi.fetchLoginTrend(7),
      ]);
      set({ items: paged.items, total: paged.total, overview, trend, loading: false });
    } catch (e) {
      set({ loading: false, error: `登录日志加载失败：${errMsg(e)}` });
    }
  },

  setFilter: (patch) => {
    set({ filter: { ...get().filter, ...patch, ...(patch.page ? {} : { page: 1 }) } });
    void get().load();
  },

  forceLogout: async (userId) => {
    set({ acting: true, error: null });
    try {
      await adminLogApi.forceUserLogout(userId);
      set({ acting: false });
      await get().load();
      return true;
    } catch (e) {
      set({ acting: false, error: `强制下线失败：${errMsg(e)}` });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
