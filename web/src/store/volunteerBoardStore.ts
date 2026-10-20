/**
 * 健澜科技 jlmedaios - 志愿服务看板 Zustand store（M504）
 * 聚合 /volunteer/* 三端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchActivity,
  fetchStats,
  fetchTeam,
  type ActivityRow,
  type TeamRow,
  type VolunteerStats,
} from '@/services/api/volunteerBoard';

interface VolunteerBoardState {
  teams: TeamRow[];
  activities: ActivityRow[];
  stats: VolunteerStats | null;
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useVolunteerBoardStore = create<VolunteerBoardState>((set) => ({
  teams: [],
  activities: [],
  stats: null,
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [t, a, s] = await Promise.all([
        fetchTeam(),
        fetchActivity(),
        fetchStats(),
      ]);
      set({
        teams: t.data,
        activities: a.data,
        stats: s.data,
        demo: t.demo || a.demo || s.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : '志愿看板加载失败',
      });
    }
  },
}));
