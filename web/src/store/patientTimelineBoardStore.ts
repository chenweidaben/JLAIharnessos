/**
 * 健澜科技 jlmedaios - 患者时间线看板 Zustand store（M508）
 * 聚合 /timeline/* 三端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchEvents,
  fetchStats,
  fetchSummary,
  type TimelineEventRow,
  type TimelineStats,
  type TimelineSummary,
} from '@/services/api/patientTimelineBoard';

interface PatientTimelineBoardState {
  events: TimelineEventRow[];
  summary: TimelineSummary | null;
  stats: TimelineStats | null;
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const usePatientTimelineBoardStore = create<PatientTimelineBoardState>((set) => ({
  events: [],
  summary: null,
  stats: null,
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [e, s, st] = await Promise.all([
        fetchEvents(),
        fetchSummary(),
        fetchStats(),
      ]);
      set({
        events: e.data,
        summary: s.data,
        stats: st.data,
        demo: e.demo || s.demo || st.demo,
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : '时间线看板加载失败',
      });
    }
  },
}));
