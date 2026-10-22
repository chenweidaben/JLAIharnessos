/**
 * 健澜科技 jlmedaios - 不良事件上报 v2 Zustand store（M663）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  createAdverseEvent,
  fetchAdverseEvents,
  type AdverseEvent,
  type AeCreateInput,
} from '@/services/api/adverseEventV2M663';

interface AdverseEventV2M663State {
  items: AdverseEvent[];
  loading: boolean;
  acting: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  create: (input: AeCreateInput) => Promise<boolean>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useAdverseEventV2M663Store = create<AdverseEventV2M663State>((set, get) => ({
  items: [],
  loading: false,
  acting: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchAdverseEvents();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '不良事件加载失败') });
    }
  },

  create: async (input) => {
    set({ acting: true, error: null });
    try {
      await createAdverseEvent(input);
      set({ acting: false });
      await get().load();
      return true;
    } catch (e) {
      set({ acting: false, error: errMsg(e, '上报不良事件失败') });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
