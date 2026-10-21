/**
 * 健澜科技 jlmedaios - 康复评估 Zustand store（M622，P12）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  createRehabAssessment,
  fetchRehabAssessments,
  type RehabAssessment,
  type RehabCreateInput,
} from '@/services/api/rehabAssessmentM622';

interface RehabAssessmentM622State {
  patientId: string;
  items: RehabAssessment[];
  loading: boolean;
  acting: boolean;
  error: string | null;
  demo: boolean;
  load: (patientId?: string) => Promise<void>;
  create: (input: RehabCreateInput) => Promise<boolean>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useRehabAssessmentM622Store = create<RehabAssessmentM622State>((set, get) => ({
  patientId: 'P-R001',
  items: [],
  loading: false,
  acting: false,
  error: null,
  demo: false,

  load: async (patientId) => {
    const pid = (patientId ?? get().patientId).trim() || 'P-R001';
    set({ patientId: pid, loading: true, error: null });
    try {
      const res = await fetchRehabAssessments(pid);
      set({ items: res.items, demo: res.demo || get().demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '康复评估加载失败') });
    }
  },

  create: async (input) => {
    set({ acting: true, error: null });
    try {
      await createRehabAssessment(input);
      set({ acting: false });
      await get().load(input.patientId);
      return true;
    } catch (e) {
      set({ acting: false, error: errMsg(e, '新建评估失败') });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
