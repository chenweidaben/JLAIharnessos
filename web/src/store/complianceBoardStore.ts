/**
 * 健澜科技 jlmedaios - 合规看板 Zustand store（M472）
 *
 * 聚合 /compliance/* 三端点：NQI 敏感指标 / 互联互通目录 / 电子病历五级缺口。
 * BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchInteropCatalog,
  fetchLevel5Gaps,
  fetchNqiIncidence,
  type InteropCatalogRow,
  type Level5GapRow,
  type NqiIncidenceRow,
} from '@/services/api/compliance';

interface ComplianceBoardState {
  nqi: NqiIncidenceRow[];
  interop: InteropCatalogRow[];
  gaps: Level5GapRow[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useComplianceBoardStore = create<ComplianceBoardState>((set) => ({
  nqi: [],
  interop: [],
  gaps: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [n, i, g] = await Promise.all([
        fetchNqiIncidence(),
        fetchInteropCatalog(),
        fetchLevel5Gaps(),
      ]);
      set({
        nqi: n.data,
        interop: i.data,
        gaps: g.data,
        demo: n.demo || i.demo || g.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : '合规看板加载失败',
      });
    }
  },
}));
