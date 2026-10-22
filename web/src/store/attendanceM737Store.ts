/**
 * 健澜科技 jlmedaios - 考勤管理 Zustand store（M737）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchAttendance,
  type AttendanceRecord,
} from '@/services/api/attendanceM737';

interface AttendanceM737State {
  items: AttendanceRecord[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useAttendanceM737Store = create<AttendanceM737State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchAttendance();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '考勤加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
