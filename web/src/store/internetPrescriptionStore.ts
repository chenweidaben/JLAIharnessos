/**
 * 健澜科技 jlmedaios - 互联网电子处方 Store（M3-L）
 *
 * 医生开方/重提/取消；药师审方队列/审方动作。
 * 健康门禁：BFF/DB 离线时不发起业务请求、不假成功。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/pharmacy';
import {
  cancelEPrescription,
  createEPrescription,
  listAuditQueue,
  listSessionPrescriptions,
  resubmitEPrescription,
  reviewEPrescription,
} from '../services/api/internetPrescription';
import type {
  EPrescriptionItemInput,
  EPrescriptionView,
} from '../types/internetPrescription';

export interface HealthState {
  online: boolean;
  dbUp: boolean;
  checkedAt: string | null;
}

interface PrescriptionState {
  /** 医生端：当前会话的处方 */
  sessionPrescriptions: EPrescriptionView[];
  /** 药师端：审方队列 */
  auditQueue: EPrescriptionView[];
  /** 当前审方详情 */
  currentAudit: EPrescriptionView | null;
  loading: boolean;
  submitting: boolean;
  health: HealthState;
  healthChecking: boolean;

  checkHealth: () => Promise<boolean>;
  loadSessionPrescriptions: (sessionId: string) => Promise<void>;
  prescribe: (input: {
    sessionId: string;
    items: EPrescriptionItemInput[];
    counsel?: string;
    idempotencyKey: string;
  }) => Promise<EPrescriptionView>;
  resubmit: (prescriptionId: string, items: EPrescriptionItemInput[]) => Promise<void>;
  cancel: (prescriptionId: string) => Promise<void>;
  loadAuditQueue: (status?: string) => Promise<void>;
  openAudit: (id: string) => Promise<void>;
  review: (
    prescriptionId: string,
    decision: 'approved' | 'rejected' | 'returned',
    auditComment?: string,
  ) => Promise<void>;
}

const initialHealth: HealthState = {
  online: false,
  dbUp: false,
  checkedAt: null,
};

export const useInternetPrescriptionStore = create<PrescriptionState>((set, get) => ({
  sessionPrescriptions: [],
  auditQueue: [],
  currentAudit: null,
  loading: false,
  submitting: false,
  health: initialHealth,
  healthChecking: false,

  checkHealth: async () => {
    set({ healthChecking: true });
    try {
      const h = await getSystemHealth();
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

  loadSessionPrescriptions: async (sessionId) => {
    if (!get().health.online) return;
    set({ loading: true });
    try {
      const list = await listSessionPrescriptions(sessionId);
      set({ sessionPrescriptions: list });
    } finally {
      set({ loading: false });
    }
  },

  prescribe: async (input) => {
    if (!get().health.online) throw new Error('后端服务或数据库不可用');
    set({ submitting: true });
    try {
      const rx = await createEPrescription(input);
      set((s) => ({
        sessionPrescriptions: [rx, ...s.sessionPrescriptions],
      }));
      return rx;
    } finally {
      set({ submitting: false });
    }
  },

  resubmit: async (prescriptionId, items) => {
    if (!get().health.online) throw new Error('后端服务或数据库不可用');
    set({ submitting: true });
    try {
      const rx = await resubmitEPrescription(prescriptionId, items);
      set((s) => ({
        sessionPrescriptions: s.sessionPrescriptions.map((r) => (r.id === rx.id ? rx : r)),
        currentAudit: s.currentAudit?.id === rx.id ? rx : s.currentAudit,
      }));
    } finally {
      set({ submitting: false });
    }
  },

  cancel: async (prescriptionId) => {
    if (!get().health.online) throw new Error('后端服务或数据库不可用');
    set({ submitting: true });
    try {
      const rx = await cancelEPrescription(prescriptionId);
      set((s) => ({
        sessionPrescriptions: s.sessionPrescriptions.map((r) => (r.id === rx.id ? rx : r)),
      }));
    } finally {
      set({ submitting: false });
    }
  },

  loadAuditQueue: async (status) => {
    if (!get().health.online) return;
    set({ loading: true });
    try {
      const list = await listAuditQueue(status ? { status } : undefined);
      set({ auditQueue: list });
    } finally {
      set({ loading: false });
    }
  },

  openAudit: async (id) => {
    if (!get().health.online) return;
    set({ currentAudit: get().auditQueue.find((r) => r.id === id) ?? null });
  },

  review: async (prescriptionId, decision, auditComment) => {
    if (!get().health.online) throw new Error('后端服务或数据库不可用');
    set({ submitting: true });
    try {
      const rx = await reviewEPrescription(prescriptionId, decision, auditComment);
      set((s) => ({
        auditQueue: s.auditQueue
          .map((r) => (r.id === rx.id ? rx : r))
          .filter((r) => r.status === 'pending_review'),
        currentAudit: s.currentAudit?.id === rx.id ? rx : s.currentAudit,
      }));
    } finally {
      set({ submitting: false });
    }
  },
}));
