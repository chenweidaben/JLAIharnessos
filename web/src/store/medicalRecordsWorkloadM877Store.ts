/**
 * 健澜科技 jlmedaios - 病案 Zustand store（M877）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchMedicalRecordsWorkload,
  type MedicalRecordsWorkload,
} from '@/services/api/medicalRecordsWorkloadM877';

interface MedicalRecordsWorkloadM877State {
  items: MedicalRecordsWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useMedicalRecordsWorkloadM877Store = create<MedicalRecordsWorkloadM877State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchMedicalRecordsWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '病案工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
