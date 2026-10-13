/**
 * 健澜科技 jlmedaios - 药事看板 store（M77-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/care';
import { listAmDash, submitAmMetric } from '@/services/api/amDashboard';
import type { DashboardRow, SubmitInput } from '@/types/amDashboard';

interface AmDashState {
  dbUp: boolean | null;
  month: string;
  rows: DashboardRow[];
  loading: boolean;
  error: string | null;
  checkHealth: () => Promise<boolean>;
  setMonth: (month: string) => Promise<void>;
  submit: (input: SubmitInput) => Promise<void>;
}

export const useAmDashStore = create<AmDashState>((set, get) => ({
  dbUp: null,
  month: '',
  rows: [],
  loading: false,
  error: null,
  checkHealth: async () => {
    try {
      const h = await getSystemHealth() as { db: 'up' | 'down' };
      const up = Boolean(h && h.db === 'up');
      set({ dbUp: up }); return up;
    } catch { set({ dbUp: false }); return false; }
  },
  setMonth: async (month) => {
    set({ month });
    if (!month || get().dbUp !== true) return;
    set({ loading: true, error: null });
    try { set({ rows: await listAmDash(month) }); }
    catch (err) { set({ error: err instanceof Error ? err.message : '加载失败' }); }
    finally { set({ loading: false }); }
  },
  submit: async (input) => {
    if (get().dbUp !== true) throw new Error('不可用');
    await submitAmMetric(input);
    await get().setMonth(get().month);
  },
}));
