/**
 * 健澜科技 jlmedaios - 科研项目 Zustand store（M739）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchResearchProjects,
  type ResearchProject,
} from '@/services/api/researchProjectM739';

interface ResearchProjectM739State {
  items: ResearchProject[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useResearchProjectM739Store = create<ResearchProjectM739State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchResearchProjects();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '科研项目加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
