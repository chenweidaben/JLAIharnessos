/**
 * 健澜科技 jlmedaios - 临床路径 v2 Zustand store（M667）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchClinicalPathways,
  type ClinicalPathway,
} from '@/services/api/clinicalPathwayV2M667';

interface ClinicalPathwayV2M667State {
  items: ClinicalPathway[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useClinicalPathwayV2M667Store = create<ClinicalPathwayV2M667State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchClinicalPathways();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '临床路径加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
