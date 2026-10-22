/**
 * 健澜科技 jlmedaios - 入院护理评估 Zustand store（M695）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchAdmissionAssessments,
  type AdmissionAssessment,
} from '@/services/api/admissionAssessmentM695';

interface AdmissionAssessmentM695State {
  items: AdmissionAssessment[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useAdmissionAssessmentM695Store = create<AdmissionAssessmentM695State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchAdmissionAssessments();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '入院评估加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
