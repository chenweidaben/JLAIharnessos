/**
 * 健澜科技 jlmedaios - 院感监控深度看板 Zustand store（M514）
 * 聚合 /infection/* 三端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchDeepRates,
  fetchHandHygiene,
  fetchStats,
  type DeepRateRow,
  type HandHygieneRow,
  type InfectionStats,
} from '@/services/api/infectionDeepBoard';

interface InfectionDeepBoardState {
  rates: DeepRateRow[];
  handHygiene: HandHygieneRow[];
  stats: InfectionStats | null;
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useInfectionDeepBoardStore = create<InfectionDeepBoardState>((set) => ({
  rates: [],
  handHygiene: [],
  stats: null,
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [r, h, s] = await Promise.all([
        fetchDeepRates(),
        fetchHandHygiene(),
        fetchStats(),
      ]);
      set({
        rates: r.data,
        handHygiene: h.data,
        stats: s.data,
        demo: r.demo || h.demo || s.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : '院感看板加载失败',
      });
    }
  },
}));
