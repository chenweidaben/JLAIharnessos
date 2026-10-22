/**
 * 健澜科技 jlmedaios - 手术记录 v2 Zustand store（M653）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  createSurgeryRecord,
  fetchSurgeryRecords,
  type SurgeryCreateInput,
  type SurgeryRecord,
} from '@/services/api/surgeryRecordV2M653';

interface SurgeryRecordV2M653State {
  patientId: string;
  items: SurgeryRecord[];
  loading: boolean;
  acting: boolean;
  error: string | null;
  demo: boolean;
  load: (patientId?: string) => Promise<void>;
  create: (input: SurgeryCreateInput) => Promise<boolean>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useSurgeryRecordV2M653Store = create<SurgeryRecordV2M653State>((set, get) => ({
  patientId: 'P10002',
  items: [],
  loading: false,
  acting: false,
  error: null,
  demo: false,

  load: async (patientId) => {
    const pid = (patientId ?? get().patientId).trim() || 'P10002';
    set({ patientId: pid, loading: true, error: null });
    try {
      const res = await fetchSurgeryRecords(pid);
      set({ items: res.items, demo: res.demo || get().demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '手术记录加载失败') });
    }
  },

  create: async (input) => {
    set({ acting: true, error: null });
    try {
      await createSurgeryRecord(input);
      set({ acting: false });
      await get().load(input.patientId);
      return true;
    } catch (e) {
      set({ acting: false, error: errMsg(e, '新建手术记录失败') });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
