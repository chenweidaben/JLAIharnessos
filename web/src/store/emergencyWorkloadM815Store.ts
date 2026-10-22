/**
 * 健澜科技 jlmedaios - 急诊科 Zustand store（M815）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchEmergencyWorkload,
  type EmergencyWorkload,
} from '@/services/api/emergencyWorkloadM815';

interface EmergencyWorkloadM815State {
  items: EmergencyWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useEmergencyWorkloadM815Store = create<EmergencyWorkloadM815State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchEmergencyWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '急诊工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
