/**
 * 健澜科技 jlmedaios - CDR 临床数据中心 v2 Zustand store（M636）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchCdrOverview,
  fetchCdrQuery,
  fetchCdrStats,
  type CdrPatientOverview,
  type CdrQueryRow,
  type CdrStats,
} from '@/services/api/cdrQueryV2M636';

interface CdrQueryV2M636State {
  patientId: string;
  overview: CdrPatientOverview | null;
  queryRows: CdrQueryRow[];
  stats: CdrStats | null;
  loading: boolean;
  error: string | null;
  demo: boolean;
  loadOverview: (patientId: string) => Promise<void>;
  runQuery: (entity: string) => Promise<void>;
  loadStats: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useCdrQueryV2M636Store = create<CdrQueryV2M636State>((set) => ({
  patientId: 'P10001',
  overview: null,
  queryRows: [],
  stats: null,
  loading: false,
  error: null,
  demo: false,

  loadOverview: async (patientId) => {
    set({ patientId, loading: true, error: null });
    try {
      const res = await fetchCdrOverview(patientId);
      set({ overview: res, demo: res.demo || get().demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '患者全景加载失败') });
    }
  },

  runQuery: async (entity) => {
    set({ loading: true, error: null });
    try {
      const res = await fetchCdrQuery(entity);
      set({ queryRows: res.items, demo: res.demo || get().demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, 'CDR 查询失败') });
    }
  },

  loadStats: async () => {
    try {
      const res = await fetchCdrStats();
      set({ stats: res, demo: res.demo || get().demo });
    } catch {
      /* swallow */
    }
  },

  clearError: () => set({ error: null }),
}));
