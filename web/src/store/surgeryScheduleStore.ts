/**
 * 健澜科技 jlmedaios - 手术排程看板 store
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSurgerySchedule, type ScheduleBoard } from '@/services/api/surgerySchedule';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

interface SurgeryScheduleState {
  board: ScheduleBoard | null;
  loading: boolean;
  error: string | null;
  load: (date: string) => Promise<void>;
}

export const useSurgeryScheduleStore = create<SurgeryScheduleState>((set) => ({
  board: null,
  loading: false,
  error: null,
  async load(date) {
    set({ loading: true, error: null });
    try {
      set({ board: await getSurgerySchedule(date), loading: false });
    } catch (e) {
      set({ board: null, loading: false, error: `手术排程加载失败：${errMsg(e)}` });
    }
  },
}));
