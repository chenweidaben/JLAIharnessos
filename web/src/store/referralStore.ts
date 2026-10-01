/**
 * 健澜科技 jlmedaios - 双向转诊状态管理（M3-R）
 *
 * 真实 BFF：发起转诊、随附资料、接收（院外患者建档+生成本院就诊）、
 * 拒绝、完成、取消。
 * 健康门禁：BFF/DB 不可用时阻断写操作并显式报错，绝不以假数据冒充。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { create } from 'zustand';
import * as refApi from '@/services/api/referral';
import { getSystemHealth } from '@/services/api/pharmacy';
import type {
  AcceptReferralInput,
  AddDocumentInput,
  CreateReferralInput,
  ReferralDirection,
  ReferralDetail,
  ReferralOrder,
} from '@/types/referral';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

interface ReferralState {
  health: { status: string; db: string } | null;
  dbUp: boolean;
  healthChecking: boolean;

  queue: ReferralOrder[];
  loading: boolean;
  directionFilter: ReferralDirection | 'all';

  detail: ReferralDetail | null;
  currentId: string | null;

  submitting: boolean;
  error: string | null;
  success: string | null;

  checkHealth: () => Promise<boolean>;
  setDirectionFilter: (d: ReferralDirection | 'all') => Promise<void>;
  loadQueue: () => Promise<void>;
  openDetail: (id: string) => Promise<boolean>;
  createReferral: (input: CreateReferralInput) => Promise<boolean>;
  addDocument: (input: AddDocumentInput) => Promise<boolean>;
  accept: (input: AcceptReferralInput) => Promise<boolean>;
  reject: (reason: string) => Promise<boolean>;
  complete: () => Promise<boolean>;
  cancel: () => Promise<boolean>;
  clearMessages: () => void;
}

export const useReferralStore = create<ReferralState>((set, get) => ({
  health: null,
  dbUp: false,
  healthChecking: false,

  queue: [],
  loading: false,
  directionFilter: 'all',

  detail: null,
  currentId: null,

  submitting: false,
  error: null,
  success: null,

  checkHealth: async () => {
    set({ healthChecking: true });
    try {
      const health = await getSystemHealth();
      const dbUp = health.db === 'up';
      set({ health, dbUp, healthChecking: false, error: null });
      return dbUp;
    } catch (e) {
      set({
        health: null,
        dbUp: false,
        healthChecking: false,
        error: `BFF/数据库连接失败：${errMsg(e)}`,
      });
      return false;
    }
  },

  setDirectionFilter: async (d) => {
    set({ directionFilter: d });
    await get().loadQueue();
  },

  loadQueue: async () => {
    set({ loading: true, error: null });
    try {
      const dir = get().directionFilter;
      const res = await refApi.listReferralsApi(
        dir === 'all' ? {} : { direction: dir },
      );
      set({ queue: res, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e) });
    }
  },

  openDetail: async (id) => {
    set({ loading: true, error: null, currentId: id });
    try {
      const detail = await refApi.getReferralApi(id);
      set({ detail, loading: false });
      return true;
    } catch (e) {
      set({ loading: false, detail: null, error: errMsg(e) });
      return false;
    }
  },

  createReferral: async (input) => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法发起转诊' });
      return false;
    }
    set({ submitting: true, error: null, success: null });
    try {
      const order = await refApi.createReferralApi(input);
      set({ submitting: false, success: `转诊单 ${order.referralNo} 已登记` });
      await get().loadQueue();
      return true;
    } catch (e) {
      set({ submitting: false, error: errMsg(e) });
      return false;
    }
  },

  addDocument: async (input) => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法补充资料' });
      return false;
    }
    const id = get().currentId;
    if (!id) return false;
    set({ submitting: true, error: null, success: null });
    try {
      const detail = await refApi.addDocumentApi(id, input);
      set({ detail, submitting: false, success: '随附资料已保存' });
      return true;
    } catch (e) {
      set({ submitting: false, error: errMsg(e) });
      return false;
    }
  },

  accept: async (input) => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法接收转诊' });
      return false;
    }
    const id = get().currentId;
    if (!id) return false;
    set({ submitting: true, error: null, success: null });
    try {
      const detail = await refApi.acceptReferralApi(id, input);
      set({ detail, submitting: false, success: '已接收，本院就诊已生成' });
      await get().loadQueue();
      return true;
    } catch (e) {
      set({ submitting: false, error: errMsg(e) });
      return false;
    }
  },

  reject: async (reason) => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法拒绝转诊' });
      return false;
    }
    const id = get().currentId;
    if (!id) return false;
    set({ submitting: true, error: null, success: null });
    try {
      await refApi.rejectReferralApi(id, reason);
      set({ submitting: false, success: '转诊已拒绝' });
      await get().loadQueue();
      await get().openDetail(id);
      return true;
    } catch (e) {
      set({ submitting: false, error: errMsg(e) });
      return false;
    }
  },

  complete: async () => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法完成转诊' });
      return false;
    }
    const id = get().currentId;
    if (!id) return false;
    set({ submitting: true, error: null, success: null });
    try {
      await refApi.completeReferralApi(id);
      set({ submitting: false, success: '转诊已完成' });
      await get().loadQueue();
      await get().openDetail(id);
      return true;
    } catch (e) {
      set({ submitting: false, error: errMsg(e) });
      return false;
    }
  },

  cancel: async () => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法取消转诊' });
      return false;
    }
    const id = get().currentId;
    if (!id) return false;
    set({ submitting: true, error: null, success: null });
    try {
      await refApi.cancelReferralApi(id);
      set({ submitting: false, success: '转诊已取消' });
      await get().loadQueue();
      await get().openDetail(id);
      return true;
    } catch (e) {
      set({ submitting: false, error: errMsg(e) });
      return false;
    }
  },

  clearMessages: () => set({ error: null, success: null }),
}));
