/**
 * 健澜科技 jlmedaios - ICU 监护记录 v2 Zustand store（M654）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchIcuMonitorRecords,
  type IcuMonitorRecord,
} from '@/services/api/icuMonitorV2M654';

interface IcuMonitorV2M654State {
  patientId: string;
  items: IcuMonitorRecord[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: (patientId?: string) => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useIcuMonitorV2M654Store = create<IcuMonitorV2M654State>((set, get) => ({
  patientId: 'P10011',
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async (patientId) => {
    const pid = (patientId ?? get().patientId).trim() || 'P10011';
    set({ patientId: pid, loading: true, error: null });
    try {
      const res = await fetchIcuMonitorRecords(pid);
      set({ items: res.items, demo: res.demo || get().demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, 'ICU 监护记录加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
