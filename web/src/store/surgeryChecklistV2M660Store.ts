/**
 * 健澜科技 jlmedaios - 手术核查表 v2 Zustand store（M660）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchSurgeryChecklists,
  type SurgeryChecklist,
} from '@/services/api/surgeryChecklistV2M660';

interface SurgeryChecklistV2M660State {
  items: SurgeryChecklist[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useSurgeryChecklistV2M660Store = create<SurgeryChecklistV2M660State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchSurgeryChecklists();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '手术核查表加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
