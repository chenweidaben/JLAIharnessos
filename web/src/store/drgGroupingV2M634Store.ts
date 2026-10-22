/**
 * 健澜科技 jlmedaios - DRG 分组看板 v2 Zustand store（M634）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import { fetchDrgBundle, type DrgCase, type DrgGroup } from '@/services/api/drgGroupingV2M634';

interface DrgGroupingV2M634State {
  cases: DrgCase[];
  groups: DrgGroup[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useDrgGroupingV2M634Store = create<DrgGroupingV2M634State>((set) => ({
  cases: [],
  groups: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchDrgBundle();
      set({ cases: res.cases, groups: res.groups, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, 'DRG 看板加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
