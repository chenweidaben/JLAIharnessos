/**
 * 健澜科技 jlmedaios - 药房调剂发药状态管理（M2-A）
 *
 * zustand store。真实模式全部经 pharmacyApi 读写 PostgreSQL，无 mock。
 *  - 健康探活门禁：checkHealth 成功才允许写操作；
 *  - 断库/连不上：dbUp=false，页面显式报错并打 antd Watermark，写操作被门禁拒绝；
 *  - 写操作（审方/发药）失败不静默：error 记录，由 UI message 呈现。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { create } from 'zustand';

import * as pharmacyApi from '@/services/api/pharmacy';
import type {
  CdsPreview,
  DispensePayload,
  DispenseResult,
  DispensingDto,
  InventoryDto,
  InventoryMovementDto,
  PharmacyHealth,
  PharmacyQueueItem,
} from '@/types/pharmacy';

export interface PharmacyState {
  /* 健康门禁 */
  health: PharmacyHealth | null;
  dbUp: boolean;
  healthChecking: boolean;
  /* 队列 */
  dispenseQueue: PharmacyQueueItem[];
  reviewQueue: PharmacyQueueItem[];
  /* 选中处方 + CDS 预览 */
  selectedId: string | null;
  cdsPreview: CdsPreview | null;
  /* 库存 / 流水 / 发药记录 */
  inventory: InventoryDto[];
  movements: InventoryMovementDto[];
  dispensings: DispensingDto[];
  /* 状态 */
  loading: boolean;
  submitting: boolean;
  error: string | null;

  /* 动作 */
  checkHealth: () => Promise<boolean>;
  loadDispenseQueue: () => Promise<void>;
  loadReviewQueue: () => Promise<void>;
  select: (id: string | null) => void;
  previewCds: (id: string) => Promise<CdsPreview | null>;
  review: (
    id: string,
    decision: 'approved' | 'rejected',
    comment?: string | null,
  ) => Promise<boolean>;
  dispense: (id: string, payload: DispensePayload) => Promise<DispenseResult | null>;
  loadInventory: () => Promise<void>;
  loadMovements: () => Promise<void>;
  loadDispensings: () => Promise<void>;
  clearError: () => void;
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export const usePharmacyStore = create<PharmacyState>((set, get) => ({
  health: null,
  dbUp: false,
  healthChecking: false,
  dispenseQueue: [],
  reviewQueue: [],
  selectedId: null,
  cdsPreview: null,
  inventory: [],
  movements: [],
  dispensings: [],
  loading: false,
  submitting: false,
  error: null,

  checkHealth: async () => {
    set({ healthChecking: true });
    try {
      const health = await pharmacyApi.getSystemHealth();
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

  loadDispenseQueue: async () => {
    set({ loading: true, error: null });
    try {
      const dispenseQueue = await pharmacyApi.fetchDispenseQueue();
      set({ dispenseQueue, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e) });
    }
  },

  loadReviewQueue: async () => {
    set({ loading: true, error: null });
    try {
      const reviewQueue = await pharmacyApi.fetchReviewQueue();
      set({ reviewQueue, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e) });
    }
  },

  select: (id) => set({ selectedId: id, cdsPreview: null }),

  previewCds: async (id) => {
    try {
      const cdsPreview = await pharmacyApi.previewCds(id);
      set({ cdsPreview });
      return cdsPreview;
    } catch (e) {
      set({ error: errMsg(e) });
      return null;
    }
  },

  review: async (id, decision, comment) => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法审方' });
      return false;
    }
    set({ submitting: true, error: null });
    try {
      await pharmacyApi.reviewPrescription(id, decision, comment);
      set({ submitting: false });
      await get().loadReviewQueue();
      await get().loadDispenseQueue();
      return true;
    } catch (e) {
      set({ submitting: false, error: errMsg(e) });
      return false;
    }
  },

  dispense: async (id, payload) => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法发药' });
      return null;
    }
    set({ submitting: true, error: null });
    try {
      const result = await pharmacyApi.dispense(id, payload);
      set({ submitting: false, selectedId: null, cdsPreview: null });
      await get().loadDispenseQueue();
      await get().loadInventory();
      await get().loadMovements();
      await get().loadDispensings();
      return result;
    } catch (e) {
      set({ submitting: false, error: errMsg(e) });
      return null;
    }
  },

  loadInventory: async () => {
    set({ loading: true, error: null });
    try {
      const inventory = await pharmacyApi.fetchInventory();
      set({ inventory, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e) });
    }
  },

  loadMovements: async () => {
    set({ loading: true, error: null });
    try {
      const movements = await pharmacyApi.fetchMovements();
      set({ movements, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e) });
    }
  },

  loadDispensings: async () => {
    set({ loading: true, error: null });
    try {
      const dispensings = await pharmacyApi.fetchDispensings();
      set({ dispensings, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e) });
    }
  },

  clearError: () => set({ error: null }),
}));
