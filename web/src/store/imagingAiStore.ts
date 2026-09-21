/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * DAMO-RADAR 辅诊状态：目录缓存 / 报告加载状态 / 复核留痕
 */
import { create } from 'zustand';

import { fetchRadarCatalog, runRadarReport, submitRadarReview } from '@/services/api/imagingAi';
import type {
  RadarCatalog,
  RadarJob,
  RadarResult,
  RadarReviewReceipt,
  RadarReviewRequest,
} from '@/types/imagingAi';

/** 报告加载阶段 */
export type RadarPhase = 'idle' | 'loading' | 'ready' | 'error';

interface ImagingAiState {
  catalog: RadarCatalog | null;
  catalogLoading: boolean;
  phase: RadarPhase;
  loadingProgress: number;
  job: RadarJob | null;
  result: RadarResult | null;
  errorMsg: string;
  reviewSubmitting: boolean;
  /** 复核留痕（提交成功后展示，并禁用重复提交） */
  reviewReceipt: RadarReviewReceipt | null;

  ensureCatalog: () => Promise<RadarCatalog | null>;
  loadReport: (studyUid: string) => Promise<void>;
  resetReport: () => void;
  submitReview: (
    jobId: string,
    body: RadarReviewRequest,
  ) => Promise<RadarReviewReceipt>;
}

export const useImagingAiStore = create<ImagingAiState>()((set, get) => ({
  catalog: null,
  catalogLoading: false,
  phase: 'idle',
  loadingProgress: 0,
  job: null,
  result: null,
  errorMsg: '',
  reviewSubmitting: false,
  reviewReceipt: null,

  ensureCatalog: async () => {
    if (get().catalog) return get().catalog;
    set({ catalogLoading: true });
    try {
      const catalog = await fetchRadarCatalog();
      set({ catalog, catalogLoading: false });
      return catalog;
    } catch {
      set({ catalogLoading: false });
      return null;
    }
  },

  loadReport: async (studyUid) => {
    set({ phase: 'loading', loadingProgress: 0, errorMsg: '', reviewReceipt: null, result: null });
    try {
      const { job, result } = await runRadarReport(studyUid, {
        onTick: (j) => set({ loadingProgress: Math.round((j.progress ?? 0) * 100) }),
      });
      set({ phase: 'ready', job, result, loadingProgress: 100 });
    } catch (e) {
      set({
        phase: 'error',
        errorMsg: e instanceof Error ? e.message : '辅诊服务暂时不可用',
      });
    }
  },

  resetReport: () =>
    set({
      phase: 'idle',
      loadingProgress: 0,
      job: null,
      result: null,
      reviewReceipt: null,
      reviewSubmitting: false,
      errorMsg: '',
    }),

  submitReview: async (jobId, body) => {
    set({ reviewSubmitting: true });
    try {
      const receipt = await submitRadarReview(jobId, body);
      set({ reviewReceipt: receipt, reviewSubmitting: false });
      return receipt;
    } catch (e) {
      set({ reviewSubmitting: false });
      throw e;
    }
  },
}));
