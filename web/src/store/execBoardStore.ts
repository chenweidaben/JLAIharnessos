/**
 * 健澜科技 jlmedaios - 运营总览大屏 Zustand store（M490）
 * 聚合 dashboard / operation / quality 三端点 + 科室床位 DEMO。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchDashboardStats,
  fetchDeptBeds,
  fetchOperationDaily,
  fetchQualityOverview,
  type DashboardStats,
  type DailyVisits,
  type DeptBedRow,
  type Grade5Overview,
} from '@/services/api/execBoard';

interface ExecBoardState {
  stats: DashboardStats | null;
  visits: DailyVisits | null;
  grade5: Grade5Overview | null;
  deptBeds: DeptBedRow[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useExecBoardStore = create<ExecBoardState>((set) => ({
  stats: null,
  visits: null,
  grade5: null,
  deptBeds: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [s, v, g, d] = await Promise.all([
        fetchDashboardStats(),
        fetchOperationDaily(),
        fetchQualityOverview(),
        fetchDeptBeds(),
      ]);
      set({
        stats: s.data,
        visits: v.data,
        grade5: g.data,
        deptBeds: d.data,
        demo: s.demo || v.demo || g.demo || d.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : '运营大屏加载失败',
      });
    }
  },
}));
