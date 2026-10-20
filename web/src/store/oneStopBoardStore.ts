/**
 * 健澜科技 jlmedaios - 一站式服务看板 Zustand store（M505）
 * 聚合 /one-stop/* 三端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchCounter,
  fetchSatisfaction,
  fetchService,
  type CounterRow,
  type SatisfactionStats,
  type ServiceRow,
} from '@/services/api/oneStopBoard';

interface OneStopBoardState {
  services: ServiceRow[];
  counters: CounterRow[];
  stats: SatisfactionStats | null;
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useOneStopBoardStore = create<OneStopBoardState>((set) => ({
  services: [],
  counters: [],
  stats: null,
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [s, c, st] = await Promise.all([
        fetchService(),
        fetchCounter(),
        fetchSatisfaction(),
      ]);
      set({
        services: s.data,
        counters: c.data,
        stats: st.data,
        demo: s.demo || c.demo || st.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : '一站式看板加载失败',
      });
    }
  },
}));
