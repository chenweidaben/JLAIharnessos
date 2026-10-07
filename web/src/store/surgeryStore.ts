/**
 * 健澜科技 jlmedaios - 手术麻醉 store（M9-C 前端闭环扩展）
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 覆盖手术麻醉全生命周期：申请→排班→术前三方核对→麻醉诱导→术中事件→
 * 阶段推进→PACU 评分→术者/麻醉双签→离室 / 取消。
 */
import { create } from 'zustand';
import type { SurgeryRequest, SurgeryDetail, SurgeryStatus } from '@/types/surgery';
import { getSystemHealth } from '../services/api/pharmacy';
import * as api from '../services/api/surgery';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export interface SubmitSurgeryInput {
  requestNo: string;
  visitId: string;
  patientId: string;
  surgeryType: 'elective' | 'emergency';
  plannedProcedure: string;
  diagnosis?: string | null;
  plannedDate?: string | null;
  department?: string;
}

interface SurgeryState {
  list: SurgeryRequest[];
  detail: SurgeryDetail | null;
  error: string | null;
  loading: boolean;
  dbUp: boolean;
  healthChecking: boolean;
  checkHealth: () => Promise<boolean>;
  submit: (input: SubmitSurgeryInput) => Promise<SurgeryRequest>;
  load: () => Promise<void>;
  loadDetail: (id: string) => Promise<void>;
  schedule: (id: string, body: Record<string, unknown>) => Promise<SurgeryRequest>;
  precheck: (id: string, precheck: Record<string, unknown>) => Promise<SurgeryRequest>;
  induction: (id: string, notes: string) => Promise<SurgeryRequest>;
  stage: (id: string, to: 'maintenance' | 'recovery' | 'pacu', notes?: string) => Promise<SurgeryRequest>;
  event: (id: string, eventType: string, payload: Record<string, unknown>) => Promise<SurgeryRequest>;
  pacu: (id: string, aldrete: number, note?: string) => Promise<{ req: SurgeryRequest; canDischarge: boolean }>;
  sign: (id: string, role: 'surgeon' | 'anesthetist') => Promise<SurgeryRequest>;
  discharge: (id: string) => Promise<SurgeryRequest>;
  cancel: (id: string, reason: string) => Promise<SurgeryRequest>;
  refreshDetail: (id: string) => Promise<void>;
}

export const useSurgeryStore = create<SurgeryState>((set, get) => ({
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
      set({
        dbUp: false, healthChecking: false,
        error: `BFF/数据库连接失败：${errMsg(e)}`,
      });
      return false;
    }
  },

  async submit(input) {
    set({ error: null });
    try {
      const r = await api.submitSurgery(input);
      await get().load();
      return r;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '提交手术申请失败' });
      throw e;
    }
  },

  async load() {
    set({ loading: true, error: null });
    try {
      set({ list: await api.listSurgeries(), loading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '加载手术列表失败', loading: false });
    }
  },

  async loadDetail(id) {
    set({ loading: true, error: null });
    try {
      set({ detail: await api.getSurgery(id), loading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '加载手术详情失败', loading: false });
    }
  },

  async refreshDetail(id) {
    const d = await api.getSurgery(id);
    set({ detail: d, error: null });
    await get().load();
  },

  async schedule(id, body) {
    const r = await api.scheduleSurgery(id, body);
    await get().refreshDetail(id);
    return r;
  },

  async precheck(id, precheck) {
    const r = await api.precheckSurgery(id, precheck);
    await get().refreshDetail(id);
    return r;
  },

  async induction(id, notes) {
    const r = await api.inductionSurgery(id, notes);
    await get().refreshDetail(id);
    return r;
  },

  async stage(id, to, notes) {
    const r = await api.stageSurgery(id, to, notes);
    await get().refreshDetail(id);
    return r;
  },

  async event(id, eventType, payload) {
    const r = await api.eventSurgery(id, eventType, payload);
    await get().refreshDetail(id);
    return r;
  },

  async pacu(id, aldrete, note) {
    const r = await api.pacuAssess(id, aldrete, note);
    await get().refreshDetail(id);
    return r;
  },

  async sign(id, role) {
    const r = await api.signSurgery(id, role);
    await get().refreshDetail(id);
    return r;
  },

  async discharge(id) {
    const r = await api.dischargeSurgery(id);
    await get().refreshDetail(id);
    return r;
  },

  async cancel(id, reason) {
    const r = await api.cancelSurgery(id, reason);
    await get().refreshDetail(id);
    return r;
  },
}));

/** 状态机辅助（与后端 TRANSITIONS 一致，纯前端展示用） */
export const SURGERY_STATUS_META: Record<SurgeryStatus, { label: string; color: string; step: number }> = {
  requested: { label: '待排程', color: 'orange', step: 0 },
  scheduled: { label: '已排程', color: 'geekblue', step: 1 },
  prechecked: { label: '已核对', color: 'purple', step: 2 },
  induction: { label: '麻醉诱导', color: 'cyan', step: 3 },
  maintenance: { label: '手术中', color: 'blue', step: 4 },
  recovery: { label: '麻醉复苏', color: 'gold', step: 5 },
  pacu: { label: 'PACU', color: 'magenta', step: 6 },
  discharged: { label: '已离室', color: 'green', step: 7 },
  cancelled: { label: '已取消', color: 'red', step: -1 },
};
