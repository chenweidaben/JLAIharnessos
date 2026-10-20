/**
 * 健澜科技 jlmedaios - 护理 NQI 看板 Zustand store（M510）
 * 聚合 /nursing/nqi/* 三端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchIncidents,
  fetchPrevention,
  fetchStats,
  type IncidentRow,
  type NqiStats,
  type PreventionRow,
} from '@/services/api/nursingNqiBoard';

interface NursingNqiBoardState {
  incidents: IncidentRow[];
  prevention: PreventionRow[];
  stats: NqiStats | null;
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useNursingNqiBoardStore = create<NursingNqiBoardState>((set) => ({
  incidents: [],
  prevention: [],
  stats: null,
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [i, p, s] = await Promise.all([
        fetchIncidents(),
        fetchPrevention(),
        fetchStats(),
      ]);
      set({
        incidents: i.data,
        prevention: p.data,
        stats: s.data,
        demo: i.demo || p.demo || s.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'NQI 看板加载失败',
      });
    }
  },
}));
