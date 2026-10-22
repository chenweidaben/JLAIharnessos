/**
 * 健澜科技 jlmedaios - 跌倒评估 v2 Zustand store（M640）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  createFallAssessment,
  fetchFallAssessments,
  type FallAssessment,
  type FallCreateInput,
} from '@/services/api/fallAssessmentV2M640';

interface FallAssessmentV2M640State {
  patientId: string;
  items: FallAssessment[];
  loading: boolean;
  acting: boolean;
  error: string | null;
  demo: boolean;
  load: (patientId?: string) => Promise<void>;
  create: (input: FallCreateInput) => Promise<boolean>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useFallAssessmentV2M640Store = create<FallAssessmentV2M640State>((set, get) => ({
  patientId: 'P10001',
  items: [],
  loading: false,
  acting: false,
  error: null,
  demo: false,

  load: async (patientId) => {
    const pid = (patientId ?? get().patientId).trim() || 'P10001';
    set({ patientId: pid, loading: true, error: null });
    try {
      const res = await fetchFallAssessments(pid);
      set({ items: res.items, demo: res.demo || get().demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '跌倒评估加载失败') });
    }
  },

  create: async (input) => {
    set({ acting: true, error: null });
    try {
      await createFallAssessment(input);
      set({ acting: false });
      await get().load(input.patientId);
      return true;
    } catch (e) {
      set({ acting: false, error: errMsg(e, '新建跌倒评估失败') });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
