/**
 * 健澜科技 jlmedaios - 新生儿科 Zustand store（M851）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchNeonatologyWorkloadM851,
  type NeonatologyWorkloadM851,
} from '@/services/api/neonatologyWorkloadM851';

interface NeonatologyWorkloadM851State {
  items: NeonatologyWorkloadM851[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useNeonatologyWorkloadM851Store = create<NeonatologyWorkloadM851State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchNeonatologyWorkloadM851();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '新生儿工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
