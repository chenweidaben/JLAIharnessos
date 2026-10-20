/**
 * 健澜科技 jlmedaios - 患者安全事件与 RCA 看板 Zustand store（M515）
 * 聚合 /safety/* 三端点 + stats。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchEvents,
  fetchRca,
  fetchRectification,
  fetchSafetyStats,
  type RcaRow,
  type RectificationRow,
  type SafetyEventRow,
  type SafetyStats,
} from '@/services/api/safetyRcaBoard';

interface SafetyRcaBoardState {
  events: SafetyEventRow[];
  rcas: RcaRow[];
  rectifications: RectificationRow[];
  stats: SafetyStats | null;
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useSafetyRcaBoardStore = create<SafetyRcaBoardState>((set) => ({
  events: [],
  rcas: [],
  rectifications: [],
  stats: null,
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [e, r, rt, s] = await Promise.all([
        fetchEvents(),
        fetchRca(),
        fetchRectification(),
        fetchSafetyStats(),
      ]);
      set({
        events: e.data,
        rcas: r.data,
        rectifications: rt.data,
        stats: s.data,
        demo: e.demo || r.demo || rt.demo || s.demo,
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : '安全事件看板加载失败',
      });
    }
  },
}));
