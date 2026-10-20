/**
 * 健澜科技 jlmedaios - 输血质控深度监控看板 Zustand store（M519）
 * 聚合 /transfusion/* 端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchAdverseReactions,
  fetchApplications,
  type ApplicationRow,
  type ReactionRow,
} from '@/services/api/transfusionDeepBoard';

interface TransfusionDeepBoardState {
  applications: ApplicationRow[];
  reactions: ReactionRow[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useTransfusionDeepBoardStore = create<TransfusionDeepBoardState>((set) => ({
  applications: [],
  reactions: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [a, r] = await Promise.all([
        fetchApplications(),
        fetchAdverseReactions(),
      ]);
      set({
        applications: a.data,
        reactions: r.data,
        demo: a.demo || r.demo,
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
