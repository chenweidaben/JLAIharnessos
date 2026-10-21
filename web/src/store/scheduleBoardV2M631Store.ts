/**
 * 健澜科技 jlmedaios - 护理排班看板 v2 Zustand store（M631，P0 合规）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchScheduleBoard,
  type NursingStaff,
  type ScheduleAssignment,
} from '@/services/api/scheduleBoardV2M631';

interface ScheduleBoardV2M631State {
  staff: NursingStaff[];
  assignments: ScheduleAssignment[];
  /** 本地编辑的覆盖：key=`${staffId}|${date}` → shift */
  overrides: Record<string, ShiftType>;
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  assign: (staffId: string, date: string, shift: ShiftType) => void;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

type ShiftType = import('@/services/api/scheduleBoardV2M631').ShiftType;

export const useScheduleBoardV2M631Store = create<ScheduleBoardV2M631State>((set, get) => ({
  staff: [],
  assignments: [],
  overrides: {},
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchScheduleBoard();
      set({ staff: res.staff, assignments: res.assignments, demo: res.demo || get().demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '排班看板加载失败') });
    }
  },

  assign: (staffId, date, shift) =>
    set({ overrides: { ...get().overrides, [`${staffId}|${date}`]: shift } }),

  clearError: () => set({ error: null }),
}));
