/**
 * 健澜科技 jlmedaios - 检验科 Zustand store（M868）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchLaboratoryWorkloadM868,
  type LaboratoryWorkloadM868,
} from '@/services/api/laboratoryWorkloadM868';

interface LaboratoryWorkloadM868State {
  items: LaboratoryWorkloadM868[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useLaboratoryWorkloadM868Store = create<LaboratoryWorkloadM868State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchLaboratoryWorkloadM868();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '检验科工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
