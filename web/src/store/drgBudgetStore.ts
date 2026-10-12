/**
 * 健澜科技 jlmedaios - DRG 预算 store（M22-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/care';
import { ackAlert, listAlerts, listBudgets } from '@/services/api/drgBudget';
import type { AlertItem, BudgetItem } from '@/types/drgBudget';

interface DrgBudgetState {
  dbUp: boolean | null;
  budgets: BudgetItem[];
  alerts: AlertItem[];
  loading: boolean;
  error: string | null;
  checkHealth: () => Promise<boolean>;
  load: () => Promise<void>;
  ack: (id: string) => Promise<void>;
}

export const useDrgBudgetStore = create<DrgBudgetState>((set, get) => ({
  dbUp: null,
  budgets: [],
  alerts: [],
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
      const [b, a] = await Promise.all([listBudgets(), listAlerts()]);
      set({ budgets: b, alerts: a });
    } catch (err) { set({ error: err instanceof Error ? err.message : '加载失败' }); }
    finally { set({ loading: false }); }
  },
  ack: async (id) => {
    if (get().dbUp !== true) throw new Error('数据库不可用');
    await ackAlert(id);
    await get().load();
  },
}));
