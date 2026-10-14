/**
 * 健澜科技 jlmedaios - M90-B AI护理计划推荐 store
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { recommendAiNursingPlan, acceptAiNursingPlan } from '@/services/api/aiNursingPlan';
import type { AiNursingPlan } from '@/services/api/aiNursingPlan';

interface AiNursingPlanState {
  record: AiNursingPlan | null;
  generating: boolean;
  acting: boolean;
  error: string | null;
  generate: (visitId: string, diagnosis: string) => Promise<void>;
  accept: () => Promise<void>;
  reset: () => void;
}

export const useAiNursingPlanStore = create<AiNursingPlanState>((set, get) => ({
  record: null,
  generating: false,
  acting: false,
  error: null,

  generate: async (visitId, diagnosis) => {
    set({ generating: true, error: null });
    try {
      set({ record: await recommendAiNursingPlan({ visitId, diagnosis }) });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '生成护理计划失败' });
      throw err;
    } finally {
      set({ generating: false });
    }
  },

  accept: async () => {
    const cur = get().record;
    if (!cur) return;
    set({ acting: true, error: null });
    try {
      set({ record: await acceptAiNursingPlan(cur.id) });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '采纳失败' });
      throw err;
    } finally {
      set({ acting: false });
    }
  },

  reset: () => set({ record: null, error: null }),
}));
