/**
 * 健澜科技 jlmedaios - 院长驾驶舱统计 Store（M9-A）
 *
 * 健康门禁：BFF/DB 不可用时显式标记，不显示假数据；
 * 真实模式从 BFF 拉取统计，失败明确报错。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { create } from 'zustand';
import { fetchDashboardStats } from '@/services/api/dashboard';
import { getSystemHealth } from '@/services/api/pharmacy';
import type { DashboardStats } from '@/types/dashboardStats';

interface DashboardStatsState {
  stats: DashboardStats | null;
  dbUp: boolean;
  healthChecking: boolean;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  checkHealth: () => Promise<boolean>;
  loadStats: (days?: number) => Promise<void>;
  refresh: (days?: number) => Promise<void>;
}

export const useDashboardStatsStore = create<DashboardStatsState>()((set) => ({
  stats: null,
  dbUp: false,
  healthChecking: false,
  loading: false,
  error: null,
  lastUpdated: null,

  checkHealth: async () => {
    set({ healthChecking: true });
    try {
      const health = await getSystemHealth();
      const dbUp = health.db === 'up';
      set({ dbUp, healthChecking: false, error: null });
      return dbUp;
    } catch {
      set({ dbUp: false, healthChecking: false });
      return false;
    }
  },

  loadStats: async (days = 14) => {
    set({ loading: true, error: null });
    try {
      const stats = await fetchDashboardStats(days);
      set({ stats, loading: false, dbUp: true, lastUpdated: new Date() });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : '统计加载失败',
      });
      throw err;
    }
  },

  refresh: async (days = 14) => {
    const up = await useDashboardStatsStore.getState().checkHealth();
    if (up) await useDashboardStatsStore.getState().loadStats(days);
  },
}));
