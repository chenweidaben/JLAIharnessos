/**
 * 健澜科技 jlmedaios - 整改效果回看 store（M22-E）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/care';
import { getByTask } from '@/services/api/improvementOutcome';
import type { OutcomeReview } from '@/types/improvementOutcome';

interface OutcomeState {
  dbUp: boolean | null;
  review: OutcomeReview | null;
  loading: boolean;
  error: string | null;
  checkHealth: () => Promise<boolean>;
  load: (taskId: string) => Promise<void>;
}

export const useOutcomeStore = create<OutcomeState>((set, get) => ({
  dbUp: null,
  review: null,
  loading: false,
  error: null,
  checkHealth: async () => {
    try {
      const h = await getSystemHealth() as { db: 'up' | 'down' };
      const up = h && h.db === 'up';
      set({ dbUp: up }); return up;
    } catch { set({ dbUp: false }); return false; }
  },
  load: async (taskId) => {
    if (get().dbUp !== true) { set({ error: '数据库不可用' }); return; }
    set({ loading: true });
    try {
      set({ review: await getByTask(taskId) });
    } catch (err) { set({ error: err instanceof Error ? err.message : '加载失败' }); }
    finally { set({ loading: false }); }
  },
}));
