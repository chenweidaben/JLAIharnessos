/**
 * 健澜科技 jlmedaios - 病理科工作流程 Zustand store（M690）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchPathologySpecimens,
  type PathologySpecimen,
} from '@/services/api/pathologyWorkflowM690';

interface PathologyWorkflowM690State {
  items: PathologySpecimen[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const usePathologyWorkflowM690Store = create<PathologyWorkflowM690State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchPathologySpecimens();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '标本流转加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
