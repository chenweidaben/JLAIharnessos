/**
 * 健澜科技 jlmedaios - 门诊预约看板 Zustand store（M503）
 * 聚合 /appointment/* 三端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchRecords,
  fetchSchedule,
  fetchStats,
  type ApptStats,
  type RecordRow,
  type ScheduleRow,
} from '@/services/api/appointmentBoard';

interface AppointmentBoardState {
  schedule: ScheduleRow[];
  records: RecordRow[];
  stats: ApptStats | null;
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useAppointmentBoardStore = create<AppointmentBoardState>((set) => ({
  schedule: [],
  records: [],
  stats: null,
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [s, r, st] = await Promise.all([
        fetchSchedule(),
        fetchRecords(),
        fetchStats(),
      ]);
      set({
        schedule: s.data,
        records: r.data,
        stats: st.data,
        demo: s.demo || r.demo || st.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : '预约看板加载失败',
      });
    }
  },
}));
