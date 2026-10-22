/**
 * 健澜科技 jlmedaios - 护理记录单 v2 Zustand store（M644）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  createNursingRecord,
  fetchNursingRecords,
  type NursingRecordCreateInput,
  type NursingRecordItem,
} from '@/services/api/nursingRecordV2M644';

interface NursingRecordV2M644State {
  patientId: string;
  items: NursingRecordItem[];
  loading: boolean;
  acting: boolean;
  error: string | null;
  demo: boolean;
  load: (patientId?: string) => Promise<void>;
  create: (input: NursingRecordCreateInput) => Promise<boolean>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useNursingRecordV2M644Store = create<NursingRecordV2M644State>((set, get) => ({
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
      const res = await fetchNursingRecords(pid);
      set({ items: res.items, demo: res.demo || get().demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '护理记录加载失败') });
    }
  },

  create: async (input) => {
    set({ acting: true, error: null });
    try {
      await createNursingRecord(input);
      set({ acting: false });
      await get().load(input.patientId);
      return true;
    } catch (e) {
      set({ acting: false, error: errMsg(e, '新增护理记录失败') });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
