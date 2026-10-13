/**
 * 健澜科技 jlmedaios - 单患者评估汇总 store（M53-A 康复/疼痛块）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/care';
import { visitEvaluations } from '@/services/api/nurseStation';
import type { VisitEvaluations } from '@/types/nurseStation';

interface EvalState {
  dbUp: boolean | null;
  data: VisitEvaluations | null;
  loading: boolean;
  error: string | null;
  checkHealth: () => Promise<boolean>;
  load: (visitId: string) => Promise<void>;
}

export const useEvalSummaryStore = create<EvalState>((set, get) => ({
  dbUp: null,
  data: null,
  loading: false,
  error: null,
  checkHealth: async () => {
    try {
      const h = await getSystemHealth() as { db: 'up' | 'down' };
      const up = Boolean(h && h.db === 'up');
      set({ dbUp: up }); return up;
    } catch { set({ dbUp: false }); return false; }
  },
  load: async (visitId) => {
    if (!visitId) return;
    if (get().dbUp !== true) { set({ error: '数据库不可用' }); return; }
    set({ loading: true, error: null });
    try { set({ data: await visitEvaluations(visitId) }); }
    catch (err) { set({ error: err instanceof Error ? err.message : '加载失败' }); }
    finally { set({ loading: false }); }
  },
}));
