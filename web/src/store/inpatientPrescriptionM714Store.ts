/**
 * 健澜科技 jlmedaios - 住院药房摆药管理 Zustand store（M714）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchInpatientPrescriptions,
  type InpatientDispensing,
} from '@/services/api/inpatientPrescriptionM714';

interface InpatientDispensingM714State {
  items: InpatientDispensing[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useInpatientDispensingM714Store = create<InpatientDispensingM714State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchInpatientPrescriptions();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '住院摆药加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
