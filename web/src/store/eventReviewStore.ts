/**
 * 健澜科技 jlmedaios - 不良事件后评估 Zustand store（M17-D）
 *
 * 健康门禁：db!=='up' 时不渲染业务数据、拒绝写操作。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/care';
import { createReview, getMetrics, listEvents, listReviews } from '@/services/api/eventReview';
import type { CreateReviewReq, EventReview, EventReviewMetrics, NursingRiskEvent } from '@/types/eventReview';

interface HealthInfo { status: string; version: string; demoMode: boolean; db: 'up' | 'down' | 'skipped'; }

interface EventReviewState {
  dbUp: boolean | null;
  health: HealthInfo | null;
  events: NursingRiskEvent[];
  reviews: EventReview[];
  metrics: EventReviewMetrics | null;
  loading: boolean;
  acting: boolean;
  error: string | null;
  checkHealth: () => Promise<boolean>;
  load: (visitId?: string) => Promise<void>;
  submit: (body: CreateReviewReq) => Promise<EventReview>;
}

export const useEventReviewStore = create<EventReviewState>((set, get) => ({
  dbUp: null,
  health: null,
  events: [],
  reviews: [],
  metrics: null,
  loading: false,
  acting: false,
  error: null,

  checkHealth: async () => {
    try {
      const h = await getSystemHealth() as HealthInfo;
      const up = h && h.db === 'up';
      set({ dbUp: up, health: h, error: up ? null : '数据库连接异常，业务数据不可用' });
      return up;
    } catch (err) {
      set({ dbUp: false, health: null, error: err instanceof Error ? err.message : '健康检查失败' });
      return false;
    }
  },

  load: async (visitId?: string) => {
    set({ loading: true, error: null });
    try {
      const [events, reviews, metrics] = await Promise.all([
        listEvents(visitId), listReviews(visitId), getMetrics(),
      ]);
      set({ events, reviews, metrics });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载失败' });
    } finally {
      set({ loading: false });
    }
  },

  submit: async (body) => {
    if (get().dbUp !== true) throw new Error('数据库不可用，禁止操作');
    set({ acting: true, error: null });
    try {
      const r = await createReview(body);
      await get().load();
      return r;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '评估登记失败';
      set({ error: msg });
      throw err;
    } finally {
      set({ acting: false });
    }
  },
}));
