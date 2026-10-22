/**
 * 健澜科技 jlmedaios - 死亡记录 v2 Zustand store（M652）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  createDeathRecord,
  fetchDeathRecords,
  type DeathRecord,
  type DeathRecordCreateInput,
} from '@/services/api/deathRecordV2M652';

interface DeathRecordV2M652State {
  patientId: string;
  items: DeathRecord[];
  loading: boolean;
  acting: boolean;
  error: string | null;
  demo: boolean;
  load: (patientId?: string) => Promise<void>;
  create: (input: DeathRecordCreateInput) => Promise<boolean>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useDeathRecordV2M652Store = create<DeathRecordV2M652State>((set, get) => ({
  patientId: 'P10030',
  items: [],
  loading: false,
  acting: false,
  error: null,
  demo: false,

  load: async (patientId) => {
    const pid = (patientId ?? get().patientId).trim() || 'P10030';
    set({ patientId: pid, loading: true, error: null });
    try {
      const res = await fetchDeathRecords(pid);
      set({ items: res.items, demo: res.demo || get().demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '死亡记录加载失败') });
    }
  },

  create: async (input) => {
    set({ acting: true, error: null });
    try {
      await createDeathRecord(input);
      set({ acting: false });
      await get().load(input.patientId);
      return true;
    } catch (e) {
      set({ acting: false, error: errMsg(e, '新建死亡记录失败') });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
