/**
 * 健澜科技 jlmedaios - 突发公共卫生事件应急 Zustand store（M764）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchPublicHealthEmergencies,
  type PublicHealthEmergency,
} from '@/services/api/publicHealthEmergencyM764';

interface PublicHealthEmergencyM764State {
  items: PublicHealthEmergency[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const usePublicHealthEmergencyM764Store = create<PublicHealthEmergencyM764State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchPublicHealthEmergencies();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '应急事件加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
