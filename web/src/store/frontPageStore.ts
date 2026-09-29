/**
 * 健澜科技 jlmedaios - 病案首页状态管理（M3-A）
 *
 * 真实 BFF：出院汇聚、编码员编码、第二人质控（职责分离）、归档。
 * 健康门禁：BFF/DB 不可用时阻断写操作并显式报错，绝不以假数据冒充。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { create } from 'zustand';
import * as fpApi from '@/services/api/frontPage';
import { getSystemHealth } from '@/services/api/pharmacy';
import type {
  FrontPageDetail,
  FrontPageQueueItem,
  ReviewPayload,
  SaveCodingPayload,
} from '@/types/frontPage';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

interface FrontPageState {
  health: { status: string; db: string } | null;
  dbUp: boolean;
  healthChecking: boolean;

  queue: FrontPageQueueItem[];
  loading: boolean;

  detail: FrontPageDetail | null;
  currentId: string | null;

  submitting: boolean;
  error: string | null;

  checkHealth: () => Promise<boolean>;
  loadQueue: () => Promise<void>;
  openPage: (id: string) => Promise<boolean>;
  saveCoding: (payload: SaveCodingPayload) => Promise<boolean>;
  review: (payload: ReviewPayload) => Promise<boolean>;
  archive: () => Promise<boolean>;
  clearError: () => void;
}

export const useFrontPageStore = create<FrontPageState>((set, get) => ({
  health: null,
  dbUp: false,
  healthChecking: false,

  queue: [],
  loading: false,

  detail: null,
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

  loadQueue: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fpApi.fetchFrontPageQueue();
      set({ queue: res.items, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e) });
    }
  },

  openPage: async (id) => {
    set({ loading: true, error: null, currentId: id });
    try {
      const detail = await fpApi.fetchFrontPage(id);
      set({ detail, loading: false });
      return true;
    } catch (e) {
      set({ loading: false, detail: null, error: errMsg(e) });
      return false;
    }
  },

  saveCoding: async (payload) => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法保存编码' });
      return false;
    }
    const id = get().currentId;
    if (!id) return false;
    set({ submitting: true, error: null });
    try {
      await fpApi.saveCoding(id, payload);
      set({ submitting: false });
      await get().loadQueue();
      return await get().openPage(id);
    } catch (e) {
      set({ submitting: false, error: errMsg(e) });
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
      await fpApi.submitReview(id, payload);
      set({ submitting: false });
      await get().loadQueue();
      return await get().openPage(id);
    } catch (e) {
      set({ submitting: false, error: errMsg(e) });
      return false;
    }
  },

  archive: async () => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法归档' });
      return false;
    }
    const id = get().currentId;
    const version = get().detail?.page.version;
    if (!id || version == null) return false;
    set({ submitting: true, error: null });
    try {
      await fpApi.archiveFrontPage(id, version);
      set({ submitting: false });
      await get().loadQueue();
      return await get().openPage(id);
    } catch (e) {
      set({ submitting: false, error: errMsg(e) });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
