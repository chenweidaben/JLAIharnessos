/**
 * 健澜科技 jlmedaios - 在院费用监控 store（M22-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/care';
import { dischargeReview, listMonitors } from '@/services/api/inpatientCostMonitor';
import type { MonitorItem } from '@/types/inpatientCostMonitor';

interface InpatientCostState {
  dbUp: boolean | null;
  monitors: MonitorItem[];
  loading: boolean;
  error: string | null;
  checkHealth: () => Promise<boolean>;
  load: () => Promise<void>;
  review: (visitId: string) => Promise<void>;
}

export const useInpatientCostStore = create<InpatientCostState>((set, get) => ({
  dbUp: null,
  monitors: [],
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
      set({ monitors: await listMonitors() });
    } catch (err) { set({ error: err instanceof Error ? err.message : '加载失败' }); }
    finally { set({ loading: false }); }
  },
  review: async (visitId) => {
    if (get().dbUp !== true) throw new Error('数据库不可用');
    await dischargeReview(visitId);
    await get().load();
  },
}));
