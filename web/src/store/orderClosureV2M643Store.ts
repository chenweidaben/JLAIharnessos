/**
 * 健澜科技 jlmedaios - 医嘱闭环 v2 Zustand store（M643）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import { fetchOrders, type OrderItem } from '@/services/api/orderClosureV2M643';

interface OrderClosureV2M643State {
  patientId: string;
  items: OrderItem[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: (patientId?: string) => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useOrderClosureV2M643Store = create<OrderClosureV2M643State>((set, get) => ({
  patientId: 'P10001',
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async (patientId) => {
    const pid = (patientId ?? get().patientId).trim() || 'P10001';
    set({ patientId: pid, loading: true, error: null });
    try {
      const res = await fetchOrders(pid);
      set({ items: res.items, demo: res.demo || get().demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '医嘱加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
