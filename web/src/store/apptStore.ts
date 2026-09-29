/**
 * 健澜科技 jlmedaios - 预约随访 store（M3-I）
 *
 * 真实 BFF：预约状态机（scheduled→confirmed→completed/absent；scheduled→cancelled）、
 * 随访计划（pending→completed）。健康门禁：BFF/DB 不可用时阻断写操作并显式报错。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';
import type { Appointment, FollowUpPlan } from '@/types/appt';
import * as api from '../services/api/appt';
import { getSystemHealth } from '@/services/api/pharmacy';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

interface ApptState {
  health: { status: string; db: string } | null;
  dbUp: boolean;
  healthChecking: boolean;

  list: Appointment[];
  plans: FollowUpPlan[];
  loading: boolean;

  currentId: string | null;
  submitting: boolean;
  error: string | null;

  checkHealth: () => Promise<boolean>;
  load: () => Promise<void>;
  createAppt: (input: Parameters<typeof api.createAppointment>[0]) => Promise<boolean>;
  confirm: (id: string) => Promise<boolean>;
  complete: (id: string, outcome: 'completed' | 'absent') => Promise<boolean>;
  cancel: (id: string, reason: string) => Promise<boolean>;
  createPlan: (input: Parameters<typeof api.createFollowUpPlan>[0]) => Promise<boolean>;
  recordFollowUp: (planId: string, outcome: string, note?: string) => Promise<boolean>;
  setCurrent: (id: string | null) => void;
  clearError: () => void;
}

export const useApptStore = create<ApptState>((set, get) => ({
  health: null,
  dbUp: false,
  healthChecking: false,

  list: [],
  plans: [],
  loading: false,

  currentId: null,
  submitting: false,
  error: null,

  checkHealth: async () => {
    set({ healthChecking: true });
    try {
      const health = await getSystemHealth();
      const dbUp = health.db === 'up';
      set({ health, dbUp, healthChecking: false, error: null });
      return dbUp;
    } catch (e) {
      set({
        health: null, dbUp: false, healthChecking: false,
        error: `BFF/数据库连接失败：${errMsg(e)}`,
      });
      return false;
    }
  },

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [list, plans] = await Promise.all([api.listAppointments(), api.listFollowUpPlans()]);
      set({ list, plans, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e) });
    }
  },

  createAppt: async (input) => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法创建预约' });
      return false;
    }
    set({ submitting: true, error: null });
    try {
      await api.createAppointment(input);
      set({ submitting: false });
      await get().load();
      return true;
    } catch (e) {
      set({ submitting: false, error: errMsg(e) });
      return false;
    }
  },

  confirm: async (id) => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法确认预约' });
      return false;
    }
    set({ submitting: true, error: null });
    try {
      await api.confirmAppointment(id);
      set({ submitting: false });
      await get().load();
      return true;
    } catch (e) {
      set({ submitting: false, error: errMsg(e) });
      return false;
    }
  },

  complete: async (id, outcome) => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法完成预约' });
      return false;
    }
    set({ submitting: true, error: null });
    try {
      await api.completeAppointment(id, outcome);
      set({ submitting: false });
      await get().load();
      return true;
    } catch (e) {
      set({ submitting: false, error: errMsg(e) });
      return false;
    }
  },

  cancel: async (id, reason) => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法取消预约' });
      return false;
    }
    set({ submitting: true, error: null });
    try {
      await api.cancelAppointment(id, reason);
      set({ submitting: false });
      await get().load();
      return true;
    } catch (e) {
      set({ submitting: false, error: errMsg(e) });
      return false;
    }
  },

  createPlan: async (input) => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法创建随访计划' });
      return false;
    }
    set({ submitting: true, error: null });
    try {
      await api.createFollowUpPlan(input);
      set({ submitting: false });
      await get().load();
      return true;
    } catch (e) {
      set({ submitting: false, error: errMsg(e) });
      return false;
    }
  },

  recordFollowUp: async (planId, outcome, note) => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法记录随访结果' });
      return false;
    }
    set({ submitting: true, error: null });
    try {
      await api.recordFollowUp(planId, outcome, note);
      set({ submitting: false });
      await get().load();
      return true;
    } catch (e) {
      set({ submitting: false, error: errMsg(e) });
      return false;
    }
  },

  setCurrent: (id) => set({ currentId: id }),
  clearError: () => set({ error: null }),
}));
