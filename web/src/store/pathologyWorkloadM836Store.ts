/**
 * 健澜科技 jlmedaios - 病理科 Zustand store（M836）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchPathologyWorkloadM836,
  type PathologyWorkloadM836,
} from '@/services/api/pathologyWorkloadM836';

interface PathologyWorkloadM836State {
  items: PathologyWorkloadM836[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const usePathologyWorkloadM836Store = create<PathologyWorkloadM836State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchPathologyWorkloadM836();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '病理工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
