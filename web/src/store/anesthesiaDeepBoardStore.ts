/**
 * 健澜科技 jlmedaios - 手术麻醉深度监控看板 Zustand store（M517）
 * 聚合 /anesthesia/* 三端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchFollowup,
  fetchGrading,
  fetchIntraop,
  type FollowupRow,
  type GradingRow,
  type IntraopRow,
} from '@/services/api/anesthesiaDeepBoard';

interface AnesthesiaDeepBoardState {
  grading: GradingRow[];
  intraop: IntraopRow[];
  followup: FollowupRow[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useAnesthesiaDeepBoardStore = create<AnesthesiaDeepBoardState>((set) => ({
  grading: [],
  intraop: [],
  followup: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [g, i, f] = await Promise.all([
        fetchGrading(),
        fetchIntraop(),
        fetchFollowup(),
      ]);
      set({
        grading: g.data,
        intraop: i.data,
        followup: f.data,
        demo: g.demo || i.demo || f.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : '麻醉看板加载失败',
      });
    }
  },
}));
