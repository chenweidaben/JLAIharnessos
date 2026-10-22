/**
 * 健澜科技 jlmedaios - 护士站工作台 Zustand store（M673）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchNurseWorkbench,
  type NurseWorkbench,
} from '@/services/api/nurseWorkbenchM673';

interface NurseWorkbenchM673State {
  ward: string;
  data: NurseWorkbench | null;
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: (ward?: string) => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useNurseWorkbenchM673Store = create<NurseWorkbenchM673State>((set, get) => ({
  ward: '呼吸一病区',
  data: null,
  loading: false,
  error: null,
  demo: false,

  load: async (ward) => {
    const w = (ward ?? get().ward).trim() || '呼吸一病区';
    set({ ward: w, loading: true, error: null });
    try {
      const res = await fetchNurseWorkbench(w);
      set({ data: res.data, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '护士站工作台加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
