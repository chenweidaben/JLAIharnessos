/**
 * 健澜科技 jlmedaios - MDT 看板 Zustand store（M499）
 * 聚合 /mdt/* 三端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchCases,
  fetchEffect,
  fetchSchedule,
  type CaseRow,
  type EffectRow,
  type ScheduleRow,
} from '@/services/api/mdtBoard';

interface MdtBoardState {
  cases: CaseRow[];
  schedule: ScheduleRow[];
  effects: EffectRow[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useMdtBoardStore = create<MdtBoardState>((set) => ({
  cases: [],
  schedule: [],
  effects: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [c, s, e] = await Promise.all([
        fetchCases(),
        fetchSchedule(),
        fetchEffect(),
      ]);
      set({
        cases: c.data,
        schedule: s.data,
        effects: e.data,
        demo: c.demo || s.demo || e.demo,
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'MDT 看板加载失败',
      });
    }
  },
}));
