/**
 * 健澜科技 jlmedaios - 随访计划 Zustand store（M619，P12）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  createFollowupPlan,
  fetchFollowupPlans,
  type FollowupCreateInput,
  type FollowupPlan,
} from '@/services/api/followupPlansM619';

interface FollowupPlansM619State {
  patientId: string;
  items: FollowupPlan[];
  loading: boolean;
  acting: boolean;
  error: string | null;
  demo: boolean;
  load: (patientId?: string) => Promise<void>;
  create: (input: FollowupCreateInput) => Promise<boolean>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useFollowupPlansM619Store = create<FollowupPlansM619State>((set, get) => ({
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
      const res = await fetchFollowupPlans(pid);
      set({ items: res.items, demo: res.demo || get().demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '随访计划加载失败') });
    }
  },

  create: async (input) => {
    set({ acting: true, error: null });
    try {
      await createFollowupPlan(input);
      set({ acting: false });
      await get().load(input.patientId);
      return true;
    } catch (e) {
      set({ acting: false, error: errMsg(e, '新建随访计划失败') });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
