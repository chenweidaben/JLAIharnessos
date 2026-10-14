/**
 * 健澜科技 jlmedaios - 电子病历评级自评 store（M87-D）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { listEmrAssessment, measureEmrMetric } from '@/services/api/emrGap';
import type { EmrMetric } from '@/types/emrGap';

interface EmrGapEmrAssessmentState {
  metrics: EmrMetric[];
  loading: boolean;
  savingCode: string | null;
  error: string | null;
  load: () => Promise<void>;
  measure: (code: string, value: number) => Promise<void>;
}

export const useEmrGapEmrAssessmentStore = create<EmrGapEmrAssessmentState>((set, get) => ({
  metrics: [],
  loading: false,
  savingCode: null,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      set({ metrics: await listEmrAssessment() });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载失败' });
    } finally {
      set({ loading: false });
    }
  },

  measure: async (code, value) => {
    set({ savingCode: code, error: null });
    try {
      const updated = await measureEmrMetric(code, value);
      set({ metrics: get().metrics.map((m) => (m.metricCode === code ? updated : m)) });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '录入失败' });
      throw err;
    } finally {
      set({ savingCode: null });
    }
  },
}));
