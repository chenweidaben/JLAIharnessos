/**
 * 健澜科技 jlmedaios - 危急值管理 v2 Zustand store（M659）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  acknowledgeCriticalValue,
  fetchCriticalValues,
  type CriticalValue,
} from '@/services/api/criticalValueV2M659';

interface CriticalValueV2M659State {
  items: CriticalValue[];
  loading: boolean;
  acting: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  acknowledge: (id: string, doctor: string) => Promise<boolean>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useCriticalValueV2M659Store = create<CriticalValueV2M659State>((set, get) => ({
  items: [],
  loading: false,
  acting: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchCriticalValues();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '危急值加载失败') });
    }
  },

  acknowledge: async (id, doctor) => {
    set({ acting: true, error: null });
    try {
      await acknowledgeCriticalValue(id, doctor);
      set({ acting: false });
      await get().load();
      return true;
    } catch (e) {
      set({ acting: false, error: errMsg(e, '签收危急值失败') });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
