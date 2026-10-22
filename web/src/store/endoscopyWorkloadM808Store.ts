/**
 * 健澜科技 jlmedaios - 内镜中心 Zustand store（M808）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchEndoscopyWorkload,
  type EndoscopyWorkload,
} from '@/services/api/endoscopyWorkloadM808';

interface EndoscopyWorkloadM808State {
  items: EndoscopyWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useEndoscopyWorkloadM808Store = create<EndoscopyWorkloadM808State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchEndoscopyWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '内镜工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
