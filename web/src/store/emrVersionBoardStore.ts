/**
 * 健澜科技 jlmedaios - 病历版本管理看板 Zustand store（M506）
 * 聚合 /emr/version/* 三端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchDiff,
  fetchList,
  fetchStats,
  type DiffRow,
  type VersionRow,
  type VersionStats,
} from '@/services/api/emrVersionBoard';

interface EmrVersionBoardState {
  list: VersionRow[];
  diffs: DiffRow[];
  stats: VersionStats | null;
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useEmrVersionBoardStore = create<EmrVersionBoardState>((set) => ({
  list: [],
  diffs: [],
  stats: null,
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [l, d, s] = await Promise.all([
        fetchList(),
        fetchDiff(),
        fetchStats(),
      ]);
      set({
        list: l.data,
        diffs: d.data,
        stats: s.data,
        demo: l.demo || d.demo || s.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : '版本看板加载失败',
      });
    }
  },
}));
