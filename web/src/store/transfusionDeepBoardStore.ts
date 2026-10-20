/**
 * 健澜科技 jlmedaios - 输血质控深度看板 Zustand store（M519）
 * 聚合 /transfusion/* 三端点。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchApplications,
  fetchReactions,
  fetchTransfusionStats,
  type ApplicationRow,
  type ReactionRow,
  type TransfusionStats,
} from '@/services/api/transfusionDeepBoard';

interface TransfusionDeepBoardState {
  applications: ApplicationRow[];
  reactions: ReactionRow[];
  stats: TransfusionStats | null;
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useTransfusionDeepBoardStore = create<TransfusionDeepBoardState>((set) => ({
  applications: [],
  reactions: [],
  stats: null,
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [a, r, s] = await Promise.all([
        fetchApplications(),
        fetchReactions(),
        fetchTransfusionStats(),
      ]);
      set({
        applications: a.data,
        reactions: r.data,
        stats: s.data,
        demo: a.demo || r.demo || s.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : '输血看板加载失败',
      });
    }
  },
}));
