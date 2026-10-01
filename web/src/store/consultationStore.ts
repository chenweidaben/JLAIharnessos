/**
 * 健澜科技 jlmedaios - 互联网问诊工作站 Store（M3-K）
 *
 * 医生 Web 工作站：待接诊队列、我的会话、聊天（接诊/回复/结束）。
 * 健康门禁：离线时不发起任何业务请求，不假成功。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/pharmacy';
import {
  acceptConsultation,
  completeConsultation,
  getConsultation,
  listDoctorConsultations,
  listPendingConsultations,
  sendDoctorMessage,
} from '../services/api/consultation';
import type {
  ConsultationDetailView,
  ConsultationSessionView,
  ConsultationStatus,
} from '../types/consultation';

export interface HealthState {
  online: boolean;
  dbUp: boolean;
  checkedAt: string | null;
}

interface ConsultationState {
  pending: ConsultationSessionView[];
  doctorSessions: ConsultationSessionView[];
  current: ConsultationDetailView | null;
  input: string;
  loading: boolean;
  sending: boolean;
  health: HealthState;
  healthChecking: boolean;

  checkHealth: () => Promise<boolean>;
  loadPending: () => Promise<void>;
  loadDoctorSessions: (status?: ConsultationStatus) => Promise<void>;
  openSession: (id: string) => Promise<void>;
  setInput: (v: string) => void;
  accept: (id: string) => Promise<void>;
  send: () => Promise<void>;
  complete: (id: string) => Promise<void>;
}

const initialHealth: HealthState = {
  online: false,
  dbUp: false,
  checkedAt: null,
};

export const useConsultationStore = create<ConsultationState>((set, get) => ({
  pending: [],
  doctorSessions: [],
  current: null,
  input: '',
  loading: false,
  sending: false,
  health: initialHealth,
  healthChecking: false,

  checkHealth: async () => {
    set({ healthChecking: true });
    try {
      const h = await getSystemHealth();
      // BFF 健康探针返回 status:'healthy'，online 判定与 appt/billing/care 等 store
      // 保持一致口径：以数据库探活为准（db === 'up'）。
      const online = h.db === 'up';
      set({
        health: { online, dbUp: h.db === 'up', checkedAt: new Date().toISOString() },
      });
      return online;
    } catch {
      set({
        health: { online: false, dbUp: false, checkedAt: new Date().toISOString() },
      });
      return false;
    } finally {
      set({ healthChecking: false });
    }
  },

  loadPending: async () => {
    if (!get().health.online) return;
    set({ loading: true });
    try {
      set({ pending: (await listPendingConsultations()) ?? [] });
    } catch (e) {
      console.error('加载待接诊队列失败', e);
    } finally {
      set({ loading: false });
    }
  },

  loadDoctorSessions: async (status?: ConsultationStatus) => {
    if (!get().health.online) return;
    set({ loading: true });
    try {
      set({ doctorSessions: (await listDoctorConsultations(status)) ?? [] });
    } catch (e) {
      console.error('加载我的会话失败', e);
    } finally {
      set({ loading: false });
    }
  },

  openSession: async (id: string) => {
    if (!get().health.online) return;
    set({ loading: true, current: null });
    try {
      const detail = await getConsultation(id);
      set({ current: detail });
    } catch (e) {
      console.error('加载会话详情失败', e);
    } finally {
      set({ loading: false });
    }
  },

  setInput: (v) => set({ input: v }),

  accept: async (id: string) => {
    if (!get().health.online) return;
    set({ sending: true });
    try {
      await acceptConsultation(id);
      await get().openSession(id);
      await get().loadPending();
      await get().loadDoctorSessions();
    } catch (e) {
      console.error('接诊失败', e);
    } finally {
      set({ sending: false });
    }
  },

  send: async () => {
    const { current, input, health } = get();
    if (!current || !health.online) return;
    const content = input.trim();
    if (!content) return;
    set({ sending: true });
    try {
      await sendDoctorMessage(current.session.id, { content });
      set({ input: '' });
      await get().openSession(current.session.id);
    } catch (e) {
      console.error('发送失败', e);
    } finally {
      set({ sending: false });
    }
  },

  complete: async (id: string) => {
    if (!get().health.online) return;
    set({ sending: true });
    try {
      await completeConsultation(id);
      await get().openSession(id);
      await get().loadPending();
      await get().loadDoctorSessions();
    } catch (e) {
      console.error('结束问诊失败', e);
    } finally {
      set({ sending: false });
    }
  },
}));
