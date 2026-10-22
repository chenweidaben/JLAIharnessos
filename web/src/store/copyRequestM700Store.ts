/**
 * 健澜科技 jlmedaios - 病历复印申请 Zustand store（M700）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchCopyRequests,
  type CopyRequest,
} from '@/services/api/copyRequestM700';

interface CopyRequestM700State {
  items: CopyRequest[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useCopyRequestM700Store = create<CopyRequestM700State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchCopyRequests();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '复印申请加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
