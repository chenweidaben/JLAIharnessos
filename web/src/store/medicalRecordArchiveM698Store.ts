/**
 * 健澜科技 jlmedaios - 病历归档管理 Zustand store（M698）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchMedicalRecordArchives,
  type MedicalRecordArchive,
} from '@/services/api/medicalRecordArchiveM698';

interface MedicalRecordArchiveM698State {
  items: MedicalRecordArchive[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useMedicalRecordArchiveM698Store = create<MedicalRecordArchiveM698State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchMedicalRecordArchives();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '病历归档加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
