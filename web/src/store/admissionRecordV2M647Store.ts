/**
 * 健澜科技 jlmedaios - 入院记录 v2 Zustand store（M647）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  createAdmissionRecord,
  fetchAdmissionRecords,
  type AdmissionCreateInput,
  type AdmissionRecord,
} from '@/services/api/admissionRecordV2M647';

interface AdmissionRecordV2M647State {
  patientId: string;
  items: AdmissionRecord[];
  loading: boolean;
  acting: boolean;
  error: string | null;
  demo: boolean;
  load: (patientId?: string) => Promise<void>;
  create: (input: AdmissionCreateInput) => Promise<boolean>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useAdmissionRecordV2M647Store = create<AdmissionRecordV2M647State>((set, get) => ({
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
      const res = await fetchAdmissionRecords(pid);
      set({ items: res.items, demo: res.demo || get().demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '入院记录加载失败') });
    }
  },

  create: async (input) => {
    set({ acting: true, error: null });
    try {
      await createAdmissionRecord(input);
      set({ acting: false });
      await get().load(input.patientId);
      return true;
    } catch (e) {
      set({ acting: false, error: errMsg(e, '新建入院记录失败') });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
