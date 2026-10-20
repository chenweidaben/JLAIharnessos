/**
 * 健澜科技 jlmedaios - CSSD 看板 Zustand store（M487）
 * 聚合 /cssd/* 三端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchQuality,
  fetchStock,
  fetchWorkload,
  type QualityRow,
  type StockRow,
  type WorkloadRow,
} from '@/services/api/cssdBoard';

interface CssdBoardState {
  workload: WorkloadRow[];
  quality: QualityRow[];
  stock: StockRow[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useCssdBoardStore = create<CssdBoardState>((set) => ({
  workload: [],
  quality: [],
  stock: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [w, q, s] = await Promise.all([
        fetchWorkload(),
        fetchQuality(),
        fetchStock(),
      ]);
      set({
        workload: w.data,
        quality: q.data,
        stock: s.data,
        demo: w.demo || q.demo || s.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'CSSD 看板加载失败',
      });
    }
  },
}));
