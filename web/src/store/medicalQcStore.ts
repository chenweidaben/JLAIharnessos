/**
 * 健澜科技 jlmedaios - 运行病历质控状态管理（M2-B）
 *
 * 真实 BFF：质控队列、规则引擎 + AI 辅助检查、三级质控签名、整改重提。
 * 健康门禁：BFF/DB 不可用时阻断写操作并显式报错，绝不以假数据冒充。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { create } from 'zustand';
import * as qcApi from '@/services/api/medicalQc';
import { getSystemHealth } from '@/services/api/pharmacy';
import type {
  QcCheckResult,
  QcQueueItem,
  QcRecordDetail,
  QcSubmitPayload,
} from '@/types/medicalQc';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

interface MedicalQcState {
  health: { status: string; db: string } | null;
  dbUp: boolean;
  healthChecking: boolean;

  queue: QcQueueItem[];
  loading: boolean;

  detail: QcRecordDetail | null;
  currentId: string | null;

  checkResult: QcCheckResult | null;
  checking: boolean;

  submitting: boolean;
  error: string | null;

  checkHealth: () => Promise<boolean>;
  loadQueue: () => Promise<void>;
  openRecord: (id: string) => Promise<boolean>;
  runCheck: (useAi: boolean) => Promise<boolean>;
  review: (payload: QcSubmitPayload) => Promise<boolean>;
  resubmit: () => Promise<boolean>;
  clearError: () => void;
}

export const useMedicalQcStore = create<MedicalQcState>((set, get) => ({
  health: null,
  dbUp: false,
  healthChecking: false,

  queue: [],
  loading: false,

  detail: null,
  currentId: null,

  checkResult: null,
  checking: false,

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

  loadQueue: async () => {
    set({ loading: true, error: null });
    try {
      const res = await qcApi.fetchQcQueue();
      set({ queue: res.items, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e) });
    }
  },

  openRecord: async (id) => {
    set({ loading: true, error: null, currentId: id, checkResult: null });
    try {
      const detail = await qcApi.fetchQcRecord(id);
      set({ detail, loading: false });
      return true;
    } catch (e) {
      set({ loading: false, detail: null, error: errMsg(e) });
      return false;
    }
  },

  runCheck: async (useAi) => {
    const id = get().currentId;
    if (!id) return false;
    set({ checking: true, error: null });
    try {
      const checkResult = await qcApi.checkQc(id, useAi);
      set({ checkResult, checking: false });
      return true;
    } catch (e) {
      set({ checking: false, error: errMsg(e) });
      return false;
    }
  },

  review: async (payload) => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法提交质控结论' });
      return false;
    }
    const id = get().currentId;
    if (!id) return false;
    set({ submitting: true, error: null });
    try {
      await qcApi.submitQc(id, payload);
      set({ submitting: false });
      await get().loadQueue();
      const ok = await get().openRecord(id);
      return ok;
    } catch (e) {
      set({ submitting: false, error: errMsg(e) });
      return false;
    }
  },

  resubmit: async () => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法重新提交' });
      return false;
    }
    const id = get().currentId;
    if (!id) return false;
    set({ submitting: true, error: null });
    try {
      await qcApi.resubmitQc(id);
      set({ submitting: false });
      await get().loadQueue();
      await get().openRecord(id);
      return true;
    } catch (e) {
      set({ submitting: false, error: errMsg(e) });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));