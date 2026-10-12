/**
 * 健澜科技 jlmedaios - 号源排班 store（M19-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/care';
import { bookSlot, cancelSlot, listSlots } from '@/services/api/scheduleSlot';
import type { SlotItem } from '@/types/scheduleSlot';

interface HealthInfo { status: string; db: 'up' | 'down' | 'skipped'; }

interface ScheduleState {
  dbUp: boolean | null;
  slots: SlotItem[];
  loading: boolean;
  error: string | null;
  checkHealth: () => Promise<boolean>;
  load: (department?: string, workDate?: string) => Promise<void>;
  book: (id: string) => Promise<void>;
  cancel: (id: string) => Promise<void>;
}

export const useScheduleSlotStore = create<ScheduleState>((set, get) => ({
  dbUp: null,
  slots: [],
  loading: false,
  error: null,

  checkHealth: async () => {
    try {
      const h = await getSystemHealth() as HealthInfo;
      const up = h && h.db === 'up';
      set({ dbUp: up });
      return up;
    } catch { set({ dbUp: false }); return false; }
  },

  load: async (department, workDate) => {
    if (get().dbUp !== true) { set({ error: '数据库不可用' }); return; }
    set({ loading: true, error: null });
    try {
      const r = await listSlots(department, workDate);
      set({ slots: r });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载失败' });
    } finally { set({ loading: false }); }
  },

  book: async (id) => {
    if (get().dbUp !== true) throw new Error('数据库不可用');
    await bookSlot(id);
  },
  cancel: async (id) => {
    if (get().dbUp !== true) throw new Error('数据库不可用');
    await cancelSlot(id);
  },
}));
