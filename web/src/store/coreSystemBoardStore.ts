/**
 * 健澜科技 jlmedaios - 核心制度看板 Zustand store（M494）
 * 聚合 /quality/core-systems / handover-round / consult-rate 三端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchConsult,
  fetchCoreSystems,
  fetchHandover,
  type ConsultRow,
  type CoreSystemRow,
  type HandoverRow,
} from '@/services/api/coreSystemBoard';

interface CoreSystemBoardState {
  systems: CoreSystemRow[];
  handovers: HandoverRow[];
  consults: ConsultRow[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useCoreSystemBoardStore = create<CoreSystemBoardState>((set) => ({
  systems: [],
  handovers: [],
  consults: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [s, h, c] = await Promise.all([
        fetchCoreSystems(),
        fetchHandover(),
        fetchConsult(),
      ]);
      set({
        systems: s.data,
        handovers: h.data,
        consults: c.data,
        demo: s.demo || h.demo || c.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : '核心制度看板加载失败',
      });
    }
  },
}));
