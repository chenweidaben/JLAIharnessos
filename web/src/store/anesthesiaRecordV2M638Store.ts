/**
 * 健澜科技 jlmedaios - 麻醉记录 v2 Zustand store（M638）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  createAnesthesiaRecord,
  fetchAnesthesiaRecords,
  type AnesthesiaCreateInput,
  type AnesthesiaRecordItem,
} from '@/services/api/anesthesiaRecordV2M638';

interface AnesthesiaRecordV2M638State {
  patientId: string;
  items: AnesthesiaRecordItem[];
  loading: boolean;
  acting: boolean;
  error: string | null;
  demo: boolean;
  load: (patientId?: string) => Promise<void>;
  create: (input: AnesthesiaCreateInput) => Promise<boolean>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useAnesthesiaRecordV2M638Store = create<AnesthesiaRecordV2M638State>((set, get) => ({
  patientId: 'P10001',
  items: [],
  loading: false,
  acting: false,
  error: null,
  demo: false,

  load: async (patientId) => {
    const pid = (patientId ?? get().patientId).trim() || 'P10001';
    set({ patientId: pid, loading: true, error: null });
    try {
      const res = await fetchAnesthesiaRecords(pid);
      set({ items: res.items, demo: res.demo || get().demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '麻醉记录加载失败') });
    }
  },

  create: async (input) => {
    set({ acting: true, error: null });
    try {
      await createAnesthesiaRecord(input);
      set({ acting: false });
      await get().load(input.patientId);
      return true;
    } catch (e) {
      set({ acting: false, error: errMsg(e, '新建麻醉记录失败') });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
