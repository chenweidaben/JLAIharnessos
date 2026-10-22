/**
 * 健澜科技 jlmedaios - 耗材采购申请 Zustand store（M732）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchPurchaseRequests,
  type PurchaseRequest,
} from '@/services/api/purchaseRequestM732';

interface PurchaseRequestM732State {
  items: PurchaseRequest[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const usePurchaseRequestM732Store = create<PurchaseRequestM732State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchPurchaseRequests();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '采购申请加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
