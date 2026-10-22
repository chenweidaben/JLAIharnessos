/**
 * 健澜科技 jlmedaios - 病案借阅管理 Zustand store（M699）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchMedicalRecordBorrows,
  type MedicalRecordBorrow,
} from '@/services/api/medicalRecordBorrowM699';

interface MedicalRecordBorrowM699State {
  items: MedicalRecordBorrow[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useMedicalRecordBorrowM699Store = create<MedicalRecordBorrowM699State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchMedicalRecordBorrows();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '病案借阅加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
