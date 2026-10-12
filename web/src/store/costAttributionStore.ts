/**
 * 健澜科技 jlmedaios - 成本归因 store（M22-C）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/care';
import { attribution } from '@/services/api/costAttribution';
import type { AttributionResult } from '@/types/costAttribution';

interface CostAttributionState {
  dbUp: boolean | null;
  result: AttributionResult | null;
  loading: boolean;
  error: string | null;
  checkHealth: () => Promise<boolean>;
  load: (visitId: string, groupCode: string) => Promise<void>;
}

export const useCostAttributionStore = create<CostAttributionState>((set, get) => ({
  dbUp: null,
  result: null,
  loading: false,
  error: null,
  checkHealth: async () => {
    try {
      const h = await getSystemHealth() as { db: 'up' | 'down' };
      const up = h && h.db === 'up';
      set({ dbUp: up }); return up;
    } catch { set({ dbUp: false }); return false; }
  },
  load: async (visitId, groupCode) => {
    if (get().dbUp !== true) { set({ error: '数据库不可用' }); return; }
    set({ loading: true });
    try {
      set({ result: await attribution(visitId, groupCode) });
    } catch (err) { set({ error: err instanceof Error ? err.message : '归因失败' }); }
    finally { set({ loading: false }); }
  },
}));
