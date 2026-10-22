/**
 * 健澜科技 jlmedaios - 放射防护 Zustand store（M909）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchRadiationProtectionWorkload,
  type RadiationProtectionWorkload,
} from '@/services/api/radiationProtectionWorkloadM909';

interface RadiationProtectionWorkloadM909State {
  items: RadiationProtectionWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useRadiationProtectionWorkloadM909Store = create<RadiationProtectionWorkloadM909State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchRadiationProtectionWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '放射防护工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
