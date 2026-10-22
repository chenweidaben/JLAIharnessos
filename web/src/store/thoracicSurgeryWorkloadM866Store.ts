/**
 * 健澜科技 jlmedaios - 胸外科 Zustand store（M866）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchThoracicSurgeryWorkload,
  type ThoracicSurgeryWorkload,
} from '@/services/api/thoracicSurgeryWorkloadM866';

interface ThoracicSurgeryWorkloadM866State {
  items: ThoracicSurgeryWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useThoracicSurgeryWorkloadM866Store = create<ThoracicSurgeryWorkloadM866State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchThoracicSurgeryWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '胸外科工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
