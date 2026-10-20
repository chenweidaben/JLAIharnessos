/**
 * 健澜科技 jlmedaios - 投诉处理看板 Zustand store（M505）
 * 聚合 /complaint/* 三端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchHandle,
  fetchList,
  fetchStats,
  type ComplaintRow,
  type ComplaintStats,
  type HandleRow,
} from '@/services/api/complaintBoard';

interface ComplaintBoardState {
  list: ComplaintRow[];
  handles: HandleRow[];
  stats: ComplaintStats | null;
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useComplaintBoardStore = create<ComplaintBoardState>((set) => ({
  list: [],
  handles: [],
  stats: null,
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [l, h, s] = await Promise.all([
        fetchList(),
        fetchHandle(),
        fetchStats(),
      ]);
      set({
        list: l.data,
        handles: h.data,
        stats: s.data,
        demo: l.demo || h.demo || s.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : '投诉看板加载失败',
      });
    }
  },
}));
