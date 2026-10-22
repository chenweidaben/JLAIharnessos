/**
 * 健澜科技 jlmedaios - 急诊科 Zustand store（M845）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchEmergencyWorkloadM845,
  type EmergencyWorkloadM845,
} from '@/services/api/emergencyWorkloadM845';

interface EmergencyWorkloadM845State {
  items: EmergencyWorkloadM845[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useEmergencyWorkloadM845Store = create<EmergencyWorkloadM845State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchEmergencyWorkloadM845();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '急诊工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
