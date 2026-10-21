/**
 * 健澜科技 jlmedaios - 采购申请 Zustand store（M612，P0）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  createPurchaseRequest,
  fetchPurchaseRequests,
  type PurchaseRequest,
  type PurchaseRequestInput,
} from '@/services/api/purchaseRequestsM612';

interface PurchaseRequestsM612State {
  items: PurchaseRequest[];
  loading: boolean;
  acting: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  create: (input: PurchaseRequestInput) => Promise<boolean>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const usePurchaseRequestsM612Store = create<PurchaseRequestsM612State>((set, get) => ({
  items: [],
  loading: false,
  acting: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchPurchaseRequests();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '采购申请列表加载失败') });
    }
  },

  create: async (input) => {
    set({ acting: true, error: null });
    try {
      await createPurchaseRequest(input);
      set({ acting: false });
      await get().load();
      return true;
    } catch (e) {
      set({ acting: false, error: errMsg(e, '采购申请提交失败') });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
