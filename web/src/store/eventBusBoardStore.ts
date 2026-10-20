/**
 * 健澜科技 jlmedaios - 事件总线监控看板 Zustand store（M511）
 * 聚合 /eventbus/* 三端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchConsumers,
  fetchEvents,
  fetchStats,
  type ConsumerRow,
  type EventBusStats,
  type EventRow,
} from '@/services/api/eventBusBoard';

interface EventBusBoardState {
  events: EventRow[];
  consumers: ConsumerRow[];
  stats: EventBusStats | null;
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useEventBusBoardStore = create<EventBusBoardState>((set) => ({
  events: [],
  consumers: [],
  stats: null,
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [e, c, s] = await Promise.all([
        fetchEvents(),
        fetchConsumers(),
        fetchStats(),
      ]);
      set({
        events: e.data,
        consumers: c.data,
        stats: s.data,
        demo: e.demo || c.demo || s.demo,
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : '事件总线看板加载失败',
      });
    }
  },
}));
