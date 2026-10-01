/**
 * 健澜科技 jlmedaios - 满意度评价 Store（M3-O）
 *
 * 健康门禁：BFF/DB 断链时明确提示，不以缓存冒充满意度评价/统计结果。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { create } from 'zustand';
import { systemApi } from '../services/api/system';
import {
  submitMySurveyApi,
  submitSurveyByStaffApi,
  listMySurveysApi,
  listSurveysApi,
  getSatisfactionStatsApi,
} from '../services/api/satisfaction';
import type {
  SatisfactionSurvey,
  SatisfactionStats,
  SatisfactionSource,
  SurveyScoresInput,
} from '../types/satisfaction';

interface SatisfactionState {
  healthOk: boolean;
  healthMsg: string;
  checking: boolean;
  loading: boolean;
  submitting: boolean;
  mySurveys: SatisfactionSurvey[];
  allSurveys: SatisfactionSurvey[];
  stats: SatisfactionStats | null;
  checkHealth: () => Promise<boolean>;
  loadMy: () => Promise<void>;
  loadAll: (filter?: { patientId?: string; sourceType?: SatisfactionSource }) => Promise<void>;
  loadStats: (sourceType?: SatisfactionSource) => Promise<void>;
  submitMy: (input: SurveyScoresInput) => Promise<{ created: boolean }>;
  submitStaff: (input: SurveyScoresInput) => Promise<{ created: boolean }>;
  reset: () => void;
}

const initialState = {
  healthOk: false,
  healthMsg: '',
  checking: false,
  loading: false,
  submitting: false,
  mySurveys: [] as SatisfactionSurvey[],
  allSurveys: [] as SatisfactionSurvey[],
  stats: null as SatisfactionStats | null,
};

export const useSatisfactionStore = create<SatisfactionState>((set, get) => ({
  ...initialState,

  checkHealth: async () => {
    if (get().checking) return get().healthOk;
    set({ checking: true });
    try {
      const h = (await systemApi.health()) as {
        db?: string;
        data?: { db?: string };
      };
      const db = h.db ?? h.data?.db;
      const ok = db === 'up';
      set({ healthOk: ok, healthMsg: ok ? '' : '数据库不可用' });
      return ok;
    } catch (err) {
      set({ healthOk: false, healthMsg: err instanceof Error ? err.message : 'BFF 不可用' });
      return false;
    } finally {
      set({ checking: false });
    }
  },

  loadMy: async () => {
    set({ loading: true });
    try {
      const surveys = await listMySurveysApi();
      set({ mySurveys: surveys });
    } finally {
      set({ loading: false });
    }
  },

  loadAll: async (filter) => {
    set({ loading: true });
    try {
      const surveys = await listSurveysApi(filter ?? {});
      set({ allSurveys: surveys });
    } finally {
      set({ loading: false });
    }
  },

  loadStats: async (sourceType) => {
    set({ loading: true });
    try {
      const stats = await getSatisfactionStatsApi(sourceType);
      set({ stats });
    } finally {
      set({ loading: false });
    }
  },

  submitMy: async (input) => {
    set({ submitting: true });
    try {
      const r = await submitMySurveyApi(input);
      return { created: r.created };
    } finally {
      set({ submitting: false });
    }
  },

  submitStaff: async (input) => {
    set({ submitting: true });
    try {
      const r = await submitSurveyByStaffApi(input);
      return { created: r.created };
    } finally {
      set({ submitting: false });
    }
  },

  reset: () => set({ ...initialState }),
}));
