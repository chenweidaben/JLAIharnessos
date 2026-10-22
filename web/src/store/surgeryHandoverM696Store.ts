/**
 * 健澜科技 jlmedaios - 手术患者交接单 Zustand store（M696）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchSurgeryHandovers,
  type SurgeryHandover,
} from '@/services/api/surgeryHandoverM696';

interface SurgeryHandoverM696State {
  items: SurgeryHandover[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useSurgeryHandoverM696Store = create<SurgeryHandoverM696State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchSurgeryHandovers();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '手术交接加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
