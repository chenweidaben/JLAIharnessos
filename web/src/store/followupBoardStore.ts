/**
 * 健澜科技 jlmedaios - 患者随访看板 Zustand store（M492）
 * 聚合 /patient/followup-* 与 /quality/readmission-30d 三端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchPlan,
  fetchReadmission,
  fetchResult,
  type PlanRow,
  type ReadmissionRow,
  type ResultRow,
} from '@/services/api/followupBoard';

interface FollowupBoardState {
  plans: PlanRow[];
  results: ResultRow[];
  readmissions: ReadmissionRow[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useFollowupBoardStore = create<FollowupBoardState>((set) => ({
  plans: [],
  results: [],
  readmissions: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [p, r, ra] = await Promise.all([
        fetchPlan(),
        fetchResult(),
        fetchReadmission(),
      ]);
      set({
        plans: p.data,
        results: r.data,
        readmissions: ra.data,
        demo: p.demo || r.demo || ra.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : '随访看板加载失败',
      });
    }
  },
}));
