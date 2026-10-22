/**
 * 健澜科技 jlmedaios - 转科记录 v2 Zustand store（M650）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  createTransferNote,
  fetchTransferNotes,
  type TransferNote,
  type TransferNoteCreateInput,
} from '@/services/api/transferNoteV2M650';

interface TransferNoteV2M650State {
  patientId: string;
  items: TransferNote[];
  loading: boolean;
  acting: boolean;
  error: string | null;
  demo: boolean;
  load: (patientId?: string) => Promise<void>;
  create: (input: TransferNoteCreateInput) => Promise<boolean>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useTransferNoteV2M650Store = create<TransferNoteV2M650State>((set, get) => ({
  patientId: 'P10009',
  items: [],
  loading: false,
  acting: false,
  error: null,
  demo: false,

  load: async (patientId) => {
    const pid = (patientId ?? get().patientId).trim() || 'P10009';
    set({ patientId: pid, loading: true, error: null });
    try {
      const res = await fetchTransferNotes(pid);
      set({ items: res.items, demo: res.demo || get().demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '转科记录加载失败') });
    }
  },

  create: async (input) => {
    set({ acting: true, error: null });
    try {
      await createTransferNote(input);
      set({ acting: false });
      await get().load(input.patientId);
      return true;
    } catch (e) {
      set({ acting: false, error: errMsg(e, '新建转科记录失败') });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
