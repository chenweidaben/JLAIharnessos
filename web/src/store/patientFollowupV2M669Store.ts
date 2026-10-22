/**
 * 健澜科技 jlmedaios - 患者随访 v2 Zustand store（M669）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchPatientFollowups,
  type PatientFollowup,
} from '@/services/api/patientFollowupV2M669';

interface PatientFollowupV2M669State {
  items: PatientFollowup[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const usePatientFollowupV2M669Store = create<PatientFollowupV2M669State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchPatientFollowups();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '随访计划加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
