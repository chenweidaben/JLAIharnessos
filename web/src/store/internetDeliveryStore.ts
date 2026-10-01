/**
 * 健澜科技 jlmedaios - 互联网配送/报告 Store（M3-N）
 *
 * 健康门禁：BFF/DB 断链时明确提示，不以缓存冒充配送履约/报告结果。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { create } from 'zustand';
import { systemApi } from '../services/api/system';
import { internetDeliveryApi } from '../services/api/internetDelivery';
import type {
  PrescriptionDeliveryView,
  PatientReportsView,
} from '../types/internetDelivery';
import type { EPrescriptionView } from '../types/internetPrescription';

interface InternetDeliveryState {
  healthOk: boolean;
  healthMsg: string;
  checking: boolean;
  loading: boolean;
  submitting: boolean;
  myDeliveries: PrescriptionDeliveryView[];
  allDeliveries: PrescriptionDeliveryView[];
  payableRx: EPrescriptionView[];
  reports: PatientReportsView | null;
  checkHealth: () => Promise<void>;
  loadMy: (patientId: string) => Promise<void>;
  loadAll: (status?: string) => Promise<void>;
  loadPayable: (patientId: string) => Promise<void>;
  createDelivery: (payload: {
    rxId: string;
    channel: 'self_pick' | 'express';
    address?: string;
  }) => Promise<void>;
  fulfill: (payload: {
    deliveryId: string;
    to: 'packed' | 'shipped' | 'delivered' | 'picked_up' | 'cancelled';
    courierCompany?: string;
    trackingNo?: string;
  }) => Promise<void>;
  loadMyReports: (patientId: string, visitId?: string) => Promise<void>;
  loadStaffReports: (patientId: string, visitId?: string) => Promise<void>;
  reset: () => void;
}

const initialState = {
  healthOk: false,
  healthMsg: '',
  checking: false,
  loading: false,
  submitting: false,
  myDeliveries: [] as PrescriptionDeliveryView[],
  allDeliveries: [] as PrescriptionDeliveryView[],
  payableRx: [] as EPrescriptionView[],
  reports: null as PatientReportsView | null,
};

export const useInternetDeliveryStore = create<InternetDeliveryState>((set, get) => ({
  ...initialState,

  checkHealth: async () => {
    if (get().checking) return;
    set({ checking: true });
    try {
      const h = (await systemApi.health()) as {
        status?: string;
        db?: string;
        data?: { db?: string };
      };
      const ok = h?.db === 'up' || h?.data?.db === 'up' || h?.status === 'healthy';
      set({ healthOk: ok, healthMsg: ok ? '' : '服务暂不可用，请稍后重试' });
    } catch {
      set({ healthOk: false, healthMsg: '服务暂不可用，请稍后重试' });
    } finally {
      set({ checking: false });
    }
  },

  loadMy: async (patientId) => {
    if (!patientId) return;
    set({ loading: true });
    try {
      const r = await internetDeliveryApi.my(patientId);
      set({ myDeliveries: r.deliveries ?? [] });
    } finally {
      set({ loading: false });
    }
  },

  loadAll: async (status) => {
    set({ loading: true });
    try {
      const r = await internetDeliveryApi.all(status);
      set({ allDeliveries: r.deliveries ?? [] });
    } finally {
      set({ loading: false });
    }
  },

  loadPayable: async (patientId) => {
    if (!patientId) return;
    set({ loading: true });
    try {
      const r = await internetDeliveryApi.myReports(patientId);
      set({ reports: r });
    } finally {
      set({ loading: false });
    }
  },

  createDelivery: async (payload) => {
    set({ submitting: true });
    try {
      await internetDeliveryApi.create(payload);
      await get().loadAll();
    } finally {
      set({ submitting: false });
    }
  },

  fulfill: async (payload) => {
    set({ submitting: true });
    try {
      await internetDeliveryApi.fulfill(payload);
      await get().loadAll();
    } finally {
      set({ submitting: false });
    }
  },

  loadMyReports: async (patientId, visitId) => {
    if (!patientId) return;
    set({ loading: true });
    try {
      set({ reports: await internetDeliveryApi.myReports(patientId, visitId) });
    } finally {
      set({ loading: false });
    }
  },

  loadStaffReports: async (patientId, visitId) => {
    if (!patientId) return;
    set({ loading: true });
    try {
      set({ reports: await internetDeliveryApi.staffReports(patientId, visitId) });
    } finally {
      set({ loading: false });
    }
  },

  reset: () => set({ ...initialState }),
}));
