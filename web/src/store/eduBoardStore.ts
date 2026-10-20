/**
 * 健澜科技 jlmedaios - 教学管理看板 Zustand store（M493）
 * 聚合 /edu/* 三端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchFellowship,
  fetchRotationExam,
  fetchTeachingRounds,
  type ExamRow,
  type FellowRow,
  type RoundsRow,
} from '@/services/api/eduBoard';

interface EduBoardState {
  rounds: RoundsRow[];
  exams: ExamRow[];
  fellows: FellowRow[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useEduBoardStore = create<EduBoardState>((set) => ({
  rounds: [],
  exams: [],
  fellows: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [r, e, f] = await Promise.all([
        fetchTeachingRounds(),
        fetchRotationExam(),
        fetchFellowship(),
      ]);
      set({
        rounds: r.data,
        exams: e.data,
        fellows: f.data,
        demo: r.demo || e.demo || f.demo,
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : '教学看板加载失败',
      });
    }
  },
}));
