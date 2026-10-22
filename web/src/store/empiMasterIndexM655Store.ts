/**
 * 健澜科技 jlmedaios - EMPI 患者主索引 Zustand store（M655）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import { fetchEmpiPatients, type EmpiPatient } from '@/services/api/empiMasterIndexM655';

interface EmpiMasterIndexM655State {
  items: EmpiPatient[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useEmpiMasterIndexM655Store = create<EmpiMasterIndexM655State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchEmpiPatients();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, 'EMPI 主索引加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
