/**
 * 健澜科技 jlmedaios - DRG/单病种经济运行看板 Zustand store（M476）
 * 聚合 /drg/* 与 /quality/* 四端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchClinicalPath,
  fetchDrgCostSummary,
  fetchDrgGroups,
  fetchSingleDisease,
  type ClinicalPathRow,
  type DrgCostSummaryRow,
  type DrgGroupRow,
  type SingleDiseaseRow,
} from '@/services/api/drgBoard';

interface DrgBoardState {
  groups: DrgGroupRow[];
  costSummary: DrgCostSummaryRow[];
  singleDisease: SingleDiseaseRow[];
  clinicalPath: ClinicalPathRow[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useDrgBoardStore = create<DrgBoardState>((set) => ({
  groups: [],
  costSummary: [],
  singleDisease: [],
  clinicalPath: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [g, c, s, p] = await Promise.all([
        fetchDrgGroups(),
        fetchDrgCostSummary(),
        fetchSingleDisease(),
        fetchClinicalPath(),
      ]);
      set({
        groups: g.data,
        costSummary: c.data,
        singleDisease: s.data,
        clinicalPath: p.data,
        demo: g.demo || c.demo || s.demo || p.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'DRG 看板加载失败',
      });
    }
  },
}));
