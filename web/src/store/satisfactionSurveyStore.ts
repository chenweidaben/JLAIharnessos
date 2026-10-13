/**
 * 健澜科技 jlmedaios - 满意度 store（M63-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/care';
import {
  submitSurvey, surveyRanking,
} from '@/services/api/satisfactionSurvey';
import type { DepartmentRank, SubmitInput } from '@/types/satisfactionSurvey';

interface SatisfactionState {
  dbUp: boolean | null;
  ranks: DepartmentRank[];
  overallAvg: number;
  loading: boolean;
  error: string | null;
  checkHealth: () => Promise<boolean>;
  loadRanking: () => Promise<void>;
  submit: (input: SubmitInput) => Promise<void>;
}

export const useSatisfactionStore = create<SatisfactionState>((set, get) => ({
  dbUp: null,
  ranks: [],
  overallAvg: 0,
  loading: false,
  error: null,
  checkHealth: async () => {
    try {
      const h = await getSystemHealth() as { db: 'up' | 'down' };
      const up = Boolean(h && h.db === 'up');
      set({ dbUp: up }); return up;
    } catch { set({ dbUp: false }); return false; }
  },
  loadRanking: async () => {
    if (get().dbUp !== true) return;
    set({ loading: true, error: null });
    try {
      const r = await surveyRanking();
      set({ ranks: r.ranks, overallAvg: r.overallAvg });
    } catch (err) { set({ error: err instanceof Error ? err.message : '加载失败' }); }
    finally { set({ loading: false }); }
  },
  submit: async (input) => {
    if (get().dbUp !== true) throw new Error('不可用');
    await submitSurvey(input);
    await get().loadRanking();
  },
}));
