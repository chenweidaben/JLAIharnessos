/**
 * 健澜科技 jlmedaios - 住院费用清单 store（按类别汇总 + 明细列表）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/care';
import { fetchBill } from '@/services/api/bill';
import type { BillListView } from '@/types/bill';

interface BillState {
  dbUp: boolean | null;
  view: BillListView | null;
  loading: boolean;
  error: string | null;
  checkHealth: () => Promise<boolean>;
  load: (visitId: string) => Promise<void>;
}

export const useBillStore = create<BillState>((set) => ({
  dbUp: null,
  view: null,
  loading: false,
  error: null,
  checkHealth: async () => {
    try {
      const h = (await getSystemHealth()) as { db: 'up' | 'down' };
      const up = Boolean(h && h.db === 'up');
      set({ dbUp: up });
      return up;
    } catch {
      set({ dbUp: false });
      return false;
    }
  },
  load: async (visitId) => {
    if (!visitId) {
      set({ error: '缺少就诊 visitId' });
      return;
    }
    set({ loading: true, error: null });
    try {
      const r = await fetchBill(visitId);
      set({ view: r });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载失败' });
    } finally {
      set({ loading: false });
    }
  },
}));
