/**
 * 健澜科技 jlmedaios - 结算分析 store（M23-D）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/care';
import { analytics } from '@/services/api/settlementAnalytics';
import type { AnalyticPoint } from '@/types/settlementAnalytics';

interface AnalyticsState {
  dbUp: boolean | null;
  points: AnalyticPoint[];
  loading: boolean;
  error: string | null;
  checkHealth: () => Promise<boolean>;
  load: () => Promise<void>;
}

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  dbUp: null,
  points: [],
  loading: false,
  error: null,
  checkHealth: async () => {
    try {
      const h = await getSystemHealth() as { db: 'up' | 'down' };
      const up = h && h.db === 'up';
      set({ dbUp: up }); return up;
    } catch { set({ dbUp: false }); return false; }
  },
  load: async () => {
    if (get().dbUp !== true) { set({ error: '数据库不可用' }); return; }
    set({ loading: true });
    try {
      set({ points: await analytics(12) });
    } catch (err) { set({ error: err instanceof Error ? err.message : '加载失败' }); }
    finally { set({ loading: false }); }
  },
}));
