/**
 * 健澜科技 jlmedaios - 神经外科 Zustand store（M865）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchNeurosurgeryWorkload,
  type NeurosurgeryWorkload,
} from '@/services/api/neurosurgeryWorkloadM865';

interface NeurosurgeryWorkloadM865State {
  items: NeurosurgeryWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useNeurosurgeryWorkloadM865Store = create<NeurosurgeryWorkloadM865State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchNeurosurgeryWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '神外工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
