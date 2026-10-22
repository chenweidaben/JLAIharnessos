/**
 * 健澜科技 jlmedaios - 急诊科 Zustand store（M883）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchEmergencyWorkloadM883,
  type EmergencyWorkloadM883,
} from '@/services/api/emergencyWorkloadM883';

interface EmergencyWorkloadM883State {
  items: EmergencyWorkloadM883[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useEmergencyWorkloadM883Store = create<EmergencyWorkloadM883State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchEmergencyWorkloadM883();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '急诊工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
