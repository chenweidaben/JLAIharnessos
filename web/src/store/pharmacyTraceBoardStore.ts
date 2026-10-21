/**
 * 健澜科技 jlmedaios - 药品追溯深度监控看板 Zustand store（M518）
 * 聚合 /pharmacy/* 三端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchColdChain,
  fetchExpiry,
  fetchTrace,
  type ColdChainRow,
  type ExpiryRow,
  type TraceRow,
} from '@/services/api/pharmacyTraceBoard';

interface PharmacyTraceBoardState {
  trace: TraceRow[];
  coldChain: ColdChainRow[];
  expiry: ExpiryRow[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const usePharmacyTraceBoardStore = create<PharmacyTraceBoardState>((set) => ({
  trace: [],
  coldChain: [],
  expiry: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [t, c, e] = await Promise.all([
        fetchTrace(),
        fetchColdChain(),
        fetchExpiry(),
      ]);
      set({
        trace: t.data,
        coldChain: c.data,
        expiry: e.data,
        demo: t.demo || c.demo || e.demo,
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : '药品追溯看板加载失败',
      });
    }
  },
}));
