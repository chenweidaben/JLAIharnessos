/**
 * 健澜科技 jlmedaios - CDS 深度规则看板 Zustand store（M509）
 * 聚合 /cds/* 三端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchLabInterpretation,
  fetchMedicationReview,
  fetchPathwayRecommend,
  type LabInterpretRow,
  type MedReviewRow,
  type PathwayRow,
} from '@/services/api/cdsDeepBoard';

interface CdsDeepBoardState {
  meds: MedReviewRow[];
  labs: LabInterpretRow[];
  pathways: PathwayRow[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useCdsDeepBoardStore = create<CdsDeepBoardState>((set) => ({
  meds: [],
  labs: [],
  pathways: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [m, l, p] = await Promise.all([
        fetchMedicationReview(),
        fetchLabInterpretation(),
        fetchPathwayRecommend(),
      ]);
      set({
        meds: m.data,
        labs: l.data,
        pathways: p.data,
        demo: m.demo || l.demo || p.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'CDS 看板加载失败',
      });
    }
  },
}));
