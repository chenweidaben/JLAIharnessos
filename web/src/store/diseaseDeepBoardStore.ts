/**
 * 健澜科技 jlmedaios - 单病种质控深度看板 Zustand store（M516）
 * 聚合 /disease/* 三端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * KPI 由 list 聚合推导。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchComplications,
  fetchOutcome,
  fetchProcess,
  type ComplicationRow,
  type OutcomeRow,
  type ProcessRow,
} from '@/services/api/diseaseDeepBoard';

interface DiseaseDeepBoardState {
  process: ProcessRow[];
  outcome: OutcomeRow[];
  complications: ComplicationRow[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useDiseaseDeepBoardStore = create<DiseaseDeepBoardState>((set) => ({
  process: [],
  outcome: [],
  complications: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [p, o, c] = await Promise.all([
        fetchProcess(),
        fetchOutcome(),
        fetchComplications(),
      ]);
      set({
        process: p.data,
        outcome: o.data,
        complications: c.data,
        demo: p.demo || o.demo || c.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : '单病种看板加载失败',
      });
    }
  },
}));
