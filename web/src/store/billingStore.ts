/**
 * 健澜科技 jlmedaios - 收费结算状态管理（M3-B）
 *
 * 真实 BFF：计费 → 归集 → 收款开票 → 退费（Saga 补偿）。
 * 健康门禁：BFF/DB 不可用时阻断写操作并显式报错，绝不以假数据冒充。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { create } from 'zustand';
import * as billingApi from '@/services/api/billing';
import { getSystemHealth } from '@/services/api/pharmacy';
import type {
  FeeItem,
  GenerateStats,
  OutstandingView,
  Settlement,
  SettlementDetail,
} from '@/types/billing';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

interface BillingState {
  health: { status: string; db: string } | null;
  dbUp: boolean;
  healthChecking: boolean;

  queue: Settlement[];
  loading: boolean;

  outstanding: OutstandingView | null;
  selectedItemIds: string[];
  paymentMethod: string;

  detail: SettlementDetail | null;
  currentId: string | null;

  submitting: boolean;
  error: string | null;
  lastMessage: string | null;

  checkHealth: () => Promise<boolean>;
  loadQueue: () => Promise<void>;

  loadOutstanding: (visitId: string) => Promise<boolean>;
  toggleItem: (id: string) => void;
  setSelectedItems: (ids: string[]) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setPaymentMethod: (m: string) => void;

  generate: (visitId: string) => Promise<GenerateStats | null>;
  /** 一键收费：归集 + 收款（已存在未付结算单时直接收款） */
  checkout: (visitId: string) => Promise<boolean>;
  pay: (id: string) => Promise<boolean>;
  void: (id: string) => Promise<boolean>;
  refund: (feeItemId: string, reason: string) => Promise<boolean>;

  openDetail: (id: string) => Promise<boolean>;
  clearError: () => void;
  clearMessage: () => void;
}

export const useBillingStore = create<BillingState>((set, get) => ({
  health: null,
  dbUp: false,
  healthChecking: false,

  queue: [],
  loading: false,

  outstanding: null,
  selectedItemIds: [],
  paymentMethod: 'cash',

  detail: null,
  currentId: null,

  submitting: false,
  error: null,
  lastMessage: null,

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
      const res = await billingApi.fetchSettlementQueue();
      set({ queue: res.items, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e) });
    }
  },

  loadOutstanding: async (visitId) => {
    set({ loading: true, error: null });
    try {
      const outstanding = await billingApi.fetchOutstanding(visitId);
      set({
        outstanding,
        selectedItemIds: outstanding.items.map((i) => i.id),
        loading: false,
      });
      return true;
    } catch (e) {
      set({ loading: false, outstanding: null, error: errMsg(e) });
      return false;
    }
  },

  toggleItem: (id) => {
    const sel = get().selectedItemIds;
    set({
      selectedItemIds: sel.includes(id)
        ? sel.filter((x) => x !== id)
        : [...sel, id],
    });
  },

  selectAll: () => {
    const items = get().outstanding?.items ?? [];
    set({ selectedItemIds: items.map((i: FeeItem) => i.id) });
  },

  setSelectedItems: (ids) => set({ selectedItemIds: ids }),

  clearSelection: () => set({ selectedItemIds: [] }),

  setPaymentMethod: (m) => set({ paymentMethod: m }),

  generate: async (visitId) => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法计费' });
      return null;
    }
    set({ submitting: true, error: null });
    try {
      const stats = await billingApi.generateFeeItems(visitId);
      set({ submitting: false });
      await get().loadOutstanding(visitId);
      return stats;
    } catch (e) {
      set({ submitting: false, error: errMsg(e) });
      return null;
    }
  },

  checkout: async (visitId) => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法收费' });
      return false;
    }
    const itemIds = get().selectedItemIds;
    if (itemIds.length === 0) {
      set({ error: '请至少选择一条待结算费用' });
      return false;
    }
    const paymentMethod = get().paymentMethod;
    set({ submitting: true, error: null });
    try {
      // 1) 归集
      const created = await billingApi.createSettlement({
        visitId, itemIds, paymentMethod,
      });
      const settlementId = created.settlement.id;
      // 2) 收款 + 开票
      await billingApi.paySettlement(settlementId);
      set({
        submitting: false,
        lastMessage: `收费成功，结算单 ${created.settlement.settlementNo} 已开具票据`,
      });
      await get().loadQueue();
      await get().loadOutstanding(visitId);
      await get().openDetail(settlementId);
      return true;
    } catch (e) {
      set({ submitting: false, error: errMsg(e) });
      return false;
    }
  },

  pay: async (id) => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法收款' });
      return false;
    }
    set({ submitting: true, error: null });
    try {
      await billingApi.paySettlement(id);
      set({ submitting: false, lastMessage: '收款成功，票据已开具' });
      await get().loadQueue();
      return await get().openDetail(id);
    } catch (e) {
      set({ submitting: false, error: errMsg(e) });
      return false;
    }
  },

  void: async (id) => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法作废' });
      return false;
    }
    set({ submitting: true, error: null });
    try {
      await billingApi.voidSettlement(id);
      set({ submitting: false, lastMessage: '结算单已作废，费用已释放' });
      await get().loadQueue();
      return true;
    } catch (e) {
      set({ submitting: false, error: errMsg(e) });
      return false;
    }
  },

  refund: async (feeItemId, reason) => {
    if (!get().dbUp) {
      set({ error: '数据库不可用，无法退费' });
      return false;
    }
    if (!reason.trim()) {
      set({ error: '退费原因必填' });
      return false;
    }
    set({ submitting: true, error: null });
    try {
      await billingApi.refundFeeItem({ feeItemId, reason });
      set({ submitting: false, lastMessage: '退费成功（Saga 补偿完成）' });
      const id = get().currentId;
      await get().loadQueue();
      if (id) await get().openDetail(id);
      return true;
    } catch (e) {
      set({ submitting: false, error: errMsg(e) });
      return false;
    }
  },

  openDetail: async (id) => {
    set({ loading: true, error: null, currentId: id });
    try {
      const detail = await billingApi.fetchSettlementDetail(id);
      set({ detail, loading: false });
      return true;
    } catch (e) {
      set({ loading: false, detail: null, error: errMsg(e) });
      return false;
    }
  },

  clearError: () => set({ error: null }),
  clearMessage: () => set({ lastMessage: null }),
}));
