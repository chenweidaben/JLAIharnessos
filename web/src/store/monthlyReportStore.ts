/**
 * 健澜科技 jlmedaios - 科室月度运营报表 store
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getMonthlyReport, type MonthlyReportData } from '@/services/api/monthlyReport';

interface MonthlyReportState {
  data: MonthlyReportData | null;
  loading: boolean;
  error: string | null;
  load: (month: string) => Promise<void>;
}

export const useMonthlyReportStore = create<MonthlyReportState>((set) => ({
  data: null,
  loading: false,
  error: null,

  load: async (month: string) => {
    set({ loading: true, error: null });
    try {
      set({ data: await getMonthlyReport(month) });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载失败' });
    } finally {
      set({ loading: false });
    }
  },
}));
