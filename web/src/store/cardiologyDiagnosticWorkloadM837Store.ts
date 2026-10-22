/**
 * 健澜科技 jlmedaios - 心电生理检查 Zustand store（M837）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchCardiologyDiagnosticWorkload,
  type CardiologyDiagnosticWorkload,
} from '@/services/api/cardiologyDiagnosticWorkloadM837';

interface CardiologyDiagnosticWorkloadM837State {
  items: CardiologyDiagnosticWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useCardiologyDiagnosticWorkloadM837Store = create<CardiologyDiagnosticWorkloadM837State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchCardiologyDiagnosticWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '心电生理工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
