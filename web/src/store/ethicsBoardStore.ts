/**
 * 健澜科技 jlmedaios - 医德医风考评看板 Zustand store（M497）
 * 聚合 /ethics/* 三端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchComplaints,
  fetchEvaluation,
  fetchRewards,
  type ComplaintRow,
  type EvaluationRow,
  type RewardRow,
} from '@/services/api/ethicsBoard';

interface EthicsBoardState {
  evaluations: EvaluationRow[];
  complaints: ComplaintRow[];
  rewards: RewardRow[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useEthicsBoardStore = create<EthicsBoardState>((set) => ({
  evaluations: [],
  complaints: [],
  rewards: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [e, c, r] = await Promise.all([
        fetchEvaluation(),
        fetchComplaints(),
        fetchRewards(),
      ]);
      set({
        evaluations: e.data,
        complaints: c.data,
        rewards: r.data,
        demo: e.demo || c.demo || r.demo,
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : '医德医风看板加载失败',
      });
    }
  },
}));
