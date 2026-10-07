/**
 * 健澜科技 jlmedaios - 输血管理 store（M10-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import type { TransfusionRequest, TransfusionDetail } from '@/types/transfusion';
import { getSystemHealth } from '../services/api/pharmacy';
import * as api from '../services/api/transfusion';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export interface ApplyInput {
  requestNo: string;
  visitId: string;
  patientId: string;
  department: string;
  indication: string;
  indicationMeta: Record<string, unknown>;
  bloodType: string;
  component: string;
  unitCount: number;
  urgency: string;
  indicationMetaHb?: number;
  indicationMetaInr?: number;
  indicationMetaPlt?: number;
  indicationMetaBleeding?: 'yes' | 'no';
  indicationMetaLoss?: number;
}

interface TransfusionState {
  list: TransfusionRequest[];
  detail: TransfusionDetail | null;
  error: string | null;
  loading: boolean;
  dbUp: boolean;
  healthChecking: boolean;
  checkHealth: () => Promise<boolean>;
  apply: (input: ApplyInput) => Promise<TransfusionRequest>;
  load: () => Promise<void>;
  loadDetail: (id: string) => Promise<void>;
  refreshDetail: (id: string) => Promise<void>;
  crossmatch: (id: string, result: string, note?: string) => Promise<TransfusionRequest>;
  dispense: (id: string, batchNo?: string) => Promise<TransfusionRequest>;
  start: (id: string, coSignBy: string, dripRate?: string) => Promise<TransfusionRequest>;
  complete: (id: string, vitalSigns?: Record<string, unknown>) => Promise<TransfusionRequest>;
  stop: (id: string, reason: string) => Promise<TransfusionRequest>;
  cancel: (id: string, reason: string) => Promise<TransfusionRequest>;
  reaction: (id: string, body: { severity: string; symptom: string; action: string; outcome?: string }) => Promise<void>;
}

export const useTransfusionStore = create<TransfusionState>((set, get) => ({
  list: [],
  detail: null,
  error: null,
  loading: false,
  dbUp: false,
  healthChecking: false,

  checkHealth: async () => {
    set({ healthChecking: true });
    try {
      const health = await getSystemHealth();
      const dbUp = health.db === 'up';
      set({ dbUp, healthChecking: false, error: null });
      return dbUp;
    } catch (e) {
      set({ dbUp: false, healthChecking: false, error: `BFF/数据库连接失败：${errMsg(e)}` });
      return false;
    }
  },

  async apply(input) {
    set({ error: null });
    try {
      const r = await api.applyTransfusion(input);
      await get().load();
      return r.req;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '提交输血申请失败' });
      throw e;
    }
  },

  async load() {
    set({ loading: true, error: null });
    try {
      set({ list: await api.listTransfusions(), loading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '加载输血申请列表失败', loading: false });
    }
  },

  async loadDetail(id) {
    set({ loading: true, error: null });
    try {
      set({ detail: await api.getTransfusion(id), loading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '加载输血详情失败', loading: false });
    }
  },

  async refreshDetail(id) {
    const d = await api.getTransfusion(id);
    set({ detail: d, error: null });
    await get().load();
  },

  async crossmatch(id, result, note) {
    const r = await api.crossmatchTransfusion(id, result, note);
    await get().refreshDetail(id);
    return r;
  },

  async dispense(id, batchNo) {
    const r = await api.dispenseTransfusion(id, batchNo);
    await get().refreshDetail(id);
    return r;
  },

  async start(id, coSignBy, dripRate) {
    const r = await api.startTransfusion(id, coSignBy, dripRate);
    await get().refreshDetail(id);
    return r;
  },

  async complete(id, vitalSigns) {
    const r = await api.completeTransfusion(id, vitalSigns);
    await get().refreshDetail(id);
    return r;
  },

  async stop(id, reason) {
    try {
      const r = await api.stopTransfusion(id, reason);
      await get().refreshDetail(id);
      return r;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '停止输注失败' });
      throw e;
    }
  },

  async cancel(id, reason) {
    try {
      const r = await api.cancelTransfusion(id, reason);
      await get().refreshDetail(id);
      return r;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '取消申请失败' });
      throw e;
    }
  },

  async reaction(id, body) {
    try {
      await api.reportReaction(id, body);
      await get().refreshDetail(id);
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '上报不良反应失败' });
      throw e;
    }
  },
}));
