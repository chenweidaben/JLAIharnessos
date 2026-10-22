/**
 * 健澜科技 jlmedaios - 医患沟通记录 Zustand store（M757）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchCommunicationRecords,
  type CommunicationRecord,
} from '@/services/api/communicationRecordM757';

interface CommunicationRecordM757State {
  items: CommunicationRecord[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useCommunicationRecordM757Store = create<CommunicationRecordM757State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchCommunicationRecords();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '沟通记录加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
