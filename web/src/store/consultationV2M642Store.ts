/**
 * 健澜科技 jlmedaios - 会诊管理 v2 Zustand store（M642）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  createConsultation,
  fetchConsultations,
  type ConsultCreateInput,
  type Consultation,
} from '@/services/api/consultationV2M642';

interface ConsultationV2M642State {
  items: Consultation[];
  loading: boolean;
  acting: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  create: (input: ConsultCreateInput) => Promise<boolean>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useConsultationV2M642Store = create<ConsultationV2M642State>((set, get) => ({
  items: [],
  loading: false,
  acting: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchConsultations();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '会诊列表加载失败') });
    }
  },

  create: async (input) => {
    set({ acting: true, error: null });
    try {
      await createConsultation(input);
      set({ acting: false });
      await get().load();
      return true;
    } catch (e) {
      set({ acting: false, error: errMsg(e, '新建会诊失败') });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
