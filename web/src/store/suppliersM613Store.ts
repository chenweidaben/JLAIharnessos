/**
 * 健澜科技 jlmedaios - 供应商管理 Zustand store（M613，P0）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  createSupplier,
  fetchSuppliers,
  type SupplierCreateInput,
  type SupplierRecord,
} from '@/services/api/suppliersM613';

interface SuppliersM613State {
  items: SupplierRecord[];
  loading: boolean;
  acting: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  create: (input: SupplierCreateInput) => Promise<boolean>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useSuppliersM613Store = create<SuppliersM613State>((set, get) => ({
  items: [],
  loading: false,
  acting: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchSuppliers();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '供应商列表加载失败') });
    }
  },

  create: async (input) => {
    set({ acting: true, error: null });
    try {
      await createSupplier(input);
      set({ acting: false });
      await get().load();
      return true;
    } catch (e) {
      set({ acting: false, error: errMsg(e, '新建供应商失败') });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
