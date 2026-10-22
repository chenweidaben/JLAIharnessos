/**
 * 健澜科技 jlmedaios - 住院预约管理 Zustand store（M720）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchInpatientAppointments,
  type InpatientAppointment,
} from '@/services/api/inpatientAppointmentM720';

interface InpatientAppointmentM720State {
  items: InpatientAppointment[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useInpatientAppointmentM720Store = create<InpatientAppointmentM720State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchInpatientAppointments();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '住院预约加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
