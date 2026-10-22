/**
 * 健澜科技 jlmedaios - 病程记录 v2 Zustand store（M648）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  createProgressNote,
  fetchProgressNotes,
  type ProgressNote,
  type ProgressNoteCreateInput,
} from '@/services/api/progressNoteV2M648';

interface ProgressNoteV2M648State {
  patientId: string;
  items: ProgressNote[];
  loading: boolean;
  acting: boolean;
  error: string | null;
  demo: boolean;
  load: (patientId?: string) => Promise<void>;
  create: (input: ProgressNoteCreateInput) => Promise<boolean>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useProgressNoteV2M648Store = create<ProgressNoteV2M648State>((set, get) => ({
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
      const res = await fetchProgressNotes(pid);
      set({ items: res.items, demo: res.demo || get().demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '病程记录加载失败') });
    }
  },

  create: async (input) => {
    set({ acting: true, error: null });
    try {
      await createProgressNote(input);
      set({ acting: false });
      await get().load(input.patientId);
      return true;
    } catch (e) {
      set({ acting: false, error: errMsg(e, '新建病程记录失败') });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
