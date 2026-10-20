/**
 * 健澜科技 jlmedaios - 日间手术看板 Zustand store（M495）
 * 聚合 /day-surgery/* 三端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchDaySurgeryList,
  fetchDaySurgeryQuality,
  fetchDaySurgeryReadmission,
  type QualityRow,
  type ReadmissionRow,
  type SurgeryRow,
} from '@/services/api/daySurgeryBoard';

interface DaySurgeryBoardState {
  list: SurgeryRow[];
  quality: QualityRow[];
  readmissions: ReadmissionRow[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useDaySurgeryBoardStore = create<DaySurgeryBoardState>((set) => ({
  list: [],
  quality: [],
  readmissions: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [l, q, r] = await Promise.all([
        fetchDaySurgeryList(),
        fetchDaySurgeryQuality(),
        fetchDaySurgeryReadmission(),
      ]);
      set({
        list: l.data,
        quality: q.data,
        readmissions: r.data,
        demo: l.demo || q.demo || r.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : '日间手术看板加载失败',
      });
    }
  },
}));
