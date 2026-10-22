/**
 * 健澜科技 jlmedaios - 消毒供应中心 Zustand store（M689）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchCswdItems,
  type CswdItem,
} from '@/services/api/cswdWorkflowM689';

interface CswdWorkflowM689State {
  items: CswdItem[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useCswdWorkflowM689Store = create<CswdWorkflowM689State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchCswdItems();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, 'CSSD 流程加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
