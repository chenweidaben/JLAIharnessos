/**
 * 健澜科技 jlmedaios - 健康教育看板 Zustand store（M496）
 * 聚合 /health-edu/* 三端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchActivities,
  fetchCoverage,
  fetchMaterials,
  type ActivityRow,
  type CoverageRow,
  type MaterialRow,
} from '@/services/api/healthEduBoard';

interface HealthEduBoardState {
  materials: MaterialRow[];
  activities: ActivityRow[];
  coverage: CoverageRow[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useHealthEduBoardStore = create<HealthEduBoardState>((set) => ({
  materials: [],
  activities: [],
  coverage: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [m, a, c] = await Promise.all([
        fetchMaterials(),
        fetchActivities(),
        fetchCoverage(),
      ]);
      set({
        materials: m.data,
        activities: a.data,
        coverage: c.data,
        demo: m.demo || a.demo || c.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : '健康教育看板加载失败',
      });
    }
  },
}));
