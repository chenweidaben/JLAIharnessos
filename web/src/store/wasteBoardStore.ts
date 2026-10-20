/**
 * 健澜科技 jlmedaios - 医废全流程看板 Zustand store（M500）
 * 聚合 /waste/* 四端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchCollection,
  fetchStatistics,
  fetchTraceability,
  fetchTreatment,
  type CollectionRow,
  type TraceabilityRow,
  type TreatmentRow,
  type WasteStats,
} from '@/services/api/wasteBoard';

interface WasteBoardState {
  collection: CollectionRow[];
  treatment: TreatmentRow[];
  traceability: TraceabilityRow[];
  stats: WasteStats | null;
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useWasteBoardStore = create<WasteBoardState>((set) => ({
  collection: [],
  treatment: [],
  traceability: [],
  stats: null,
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [c, t, tr, s] = await Promise.all([
        fetchCollection(),
        fetchTreatment(),
        fetchTraceability(),
        fetchStatistics(),
      ]);
      set({
        collection: c.data,
        treatment: t.data,
        traceability: tr.data,
        stats: s.data,
        demo: c.demo || t.demo || tr.demo || s.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : '医废看板加载失败',
      });
    }
  },
}));
