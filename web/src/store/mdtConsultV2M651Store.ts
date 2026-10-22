/**
 * 健澜科技 jlmedaios - MDT 多学科会诊 v2 Zustand store（M651）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  createMdtConsult,
  fetchMdtConsults,
  type MdtConsult,
  type MdtCreateInput,
} from '@/services/api/mdtConsultV2M651';

interface MdtConsultV2M651State {
  patientId: string;
  items: MdtConsult[];
  loading: boolean;
  acting: boolean;
  error: string | null;
  demo: boolean;
  load: (patientId?: string) => Promise<void>;
  create: (input: MdtCreateInput) => Promise<boolean>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useMdtConsultV2M651Store = create<MdtConsultV2M651State>((set, get) => ({
  patientId: 'P10020',
  items: [],
  loading: false,
  acting: false,
  error: null,
  demo: false,

  load: async (patientId) => {
    const pid = (patientId ?? get().patientId).trim() || 'P10020';
    set({ patientId: pid, loading: true, error: null });
    try {
      const res = await fetchMdtConsults(pid);
      set({ items: res.items, demo: res.demo || get().demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, 'MDT 列表加载失败') });
    }
  },

  create: async (input) => {
    set({ acting: true, error: null });
    try {
      await createMdtConsult(input);
      set({ acting: false });
      await get().load(input.patientId);
      return true;
    } catch (e) {
      set({ acting: false, error: errMsg(e, '新建 MDT 失败') });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
