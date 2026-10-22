/**
 * 健澜科技 jlmedaios - 输血反应 v2 Zustand store（M639）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  createTransfusionReaction,
  fetchTransfusionReactions,
  type ReactionCreateInput,
  type TransfusionReaction,
} from '@/services/api/transfusionReactionV2M639';

interface TransfusionReactionV2M639State {
  patientId: string;
  items: TransfusionReaction[];
  loading: boolean;
  acting: boolean;
  error: string | null;
  demo: boolean;
  load: (patientId?: string) => Promise<void>;
  create: (input: ReactionCreateInput) => Promise<boolean>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useTransfusionReactionV2M639Store = create<TransfusionReactionV2M639State>((set, get) => ({
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
      const res = await fetchTransfusionReactions(pid);
      set({ items: res.items, demo: res.demo || get().demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '输血反应加载失败') });
    }
  },

  create: async (input) => {
    set({ acting: true, error: null });
    try {
      await createTransfusionReaction(input);
      set({ acting: false });
      await get().load(input.patientId);
      return true;
    } catch (e) {
      set({ acting: false, error: errMsg(e, '上报输血反应失败') });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
