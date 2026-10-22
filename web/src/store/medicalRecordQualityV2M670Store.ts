/**
 * 健澜科技 jlmedaios - 病历质控 v2 Zustand store（M670）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchMedicalRecordQuality,
  type MedicalRecordQuality,
} from '@/services/api/medicalRecordQualityV2M670';

interface MedicalRecordQualityV2M670State {
  items: MedicalRecordQuality[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useMedicalRecordQualityV2M670Store = create<MedicalRecordQualityV2M670State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchMedicalRecordQuality();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '病历质控加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
