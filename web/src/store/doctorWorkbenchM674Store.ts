/**
 * 健澜科技 jlmedaios - 医生站工作台 Zustand store（M674）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchDoctorWorkbench,
  type DoctorWorkbench,
} from '@/services/api/doctorWorkbenchM674';

interface DoctorWorkbenchM674State {
  data: DoctorWorkbench | null;
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useDoctorWorkbenchM674Store = create<DoctorWorkbenchM674State>((set) => ({
  data: null,
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchDoctorWorkbench();
      set({ data: res.data, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '医生站工作台加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
