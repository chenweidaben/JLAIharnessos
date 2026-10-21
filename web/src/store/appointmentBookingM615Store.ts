/**
 * 健澜科技 jlmedaios - 预约挂号 Zustand store（M615，P11）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  createAppointment,
  fetchAppointments,
  fetchSlots,
  type AppointmentCreateInput,
  type AppointmentRecord,
  type SlotItem,
} from '@/services/api/appointmentBookingM615';

interface AppointmentBookingM615State {
  patientId: string;
  records: AppointmentRecord[];
  slots: SlotItem[];
  loading: boolean;
  acting: boolean;
  error: string | null;
  demo: boolean;
  load: (patientId?: string) => Promise<void>;
  loadSlots: (date: string) => Promise<void>;
  book: (input: AppointmentCreateInput) => Promise<boolean>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useAppointmentBookingM615Store = create<AppointmentBookingM615State>((set, get) => ({
  patientId: 'P10001',
  records: [],
  slots: [],
  loading: false,
  acting: false,
  error: null,
  demo: false,

  load: async (patientId) => {
    const pid = (patientId ?? get().patientId).trim() || 'P10001';
    set({ patientId: pid, loading: true, error: null });
    try {
      const res = await fetchAppointments(pid);
      set({ records: res.items, demo: res.demo || get().demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '预约列表加载失败') });
    }
  },

  loadSlots: async (date) => {
    set({ loading: true, error: null });
    try {
      const slots = await fetchSlots(date);
      set({ slots, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '号源加载失败') });
    }
  },

  book: async (input) => {
    set({ acting: true, error: null });
    try {
      await createAppointment(input);
      set({ acting: false });
      await get().load(input.patientId);
      return true;
    } catch (e) {
      set({ acting: false, error: errMsg(e, '预约失败') });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
