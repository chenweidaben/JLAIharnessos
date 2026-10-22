/**
 * 健澜科技 jlmedaios - 病理科 Zustand store（M871）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchPathologyWorkloadM871,
  type PathologyWorkloadM871,
} from '@/services/api/pathologyWorkloadM871';

interface PathologyWorkloadM871State {
  items: PathologyWorkloadM871[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const usePathologyWorkloadM871Store = create<PathologyWorkloadM871State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchPathologyWorkloadM871();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '病理工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
