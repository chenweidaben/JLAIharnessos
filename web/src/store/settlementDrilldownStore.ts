/**
 * 健澜科技 jlmedaios - 结算下钻 store（M23-E）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/care';
import { drilldown } from '@/services/api/settlementDrilldown';
import type { DrilldownResult } from '@/types/settlementDrilldown';

interface DrilldownState {
  dbUp: boolean | null;
  result: DrilldownResult;
  loading: boolean;
  error: string | null;
  checkHealth: () => Promise<boolean>;
  load: (period: string) => Promise<void>;
}

export const useDrilldownStore = create<DrilldownState>((set, get) => ({
  dbUp: null,
  result: { byDepartment: [], byDoctor: [] },
  loading: false,
  error: null,
  checkHealth: async () => {
    try {
      const h = await getSystemHealth() as { db: 'up' | 'down' };
      const up = h && h.db === 'up';
      set({ dbUp: up }); return up;
    } catch { set({ dbUp: false }); return false; }
  },
  load: async (period: string) => {
    if (get().dbUp !== true) { set({ error: '数据库不可用' }); return; }
    set({ loading: true });
    try {
      set({ result: await drilldown(period) });
    } catch (err) { set({ error: err instanceof Error ? err.message : '加载失败' }); }
    finally { set({ loading: false }); }
  },
}));
