/**
 * 健澜科技 jlmedaios - 医技科室运营看板 Zustand store（M489）
 * 聚合 /lab|radiology|pathology/workload 三端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchLab,
  fetchPathology,
  fetchRadiology,
  type LabRow,
  type PathologyRow,
  type RadiologyRow,
} from '@/services/api/medtechBoard';

interface MedtechBoardState {
  lab: LabRow[];
  radiology: RadiologyRow[];
  pathology: PathologyRow[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useMedtechBoardStore = create<MedtechBoardState>((set) => ({
  lab: [],
  radiology: [],
  pathology: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [l, r, p] = await Promise.all([
        fetchLab(),
        fetchRadiology(),
        fetchPathology(),
      ]);
      set({
        lab: l.data,
        radiology: r.data,
        pathology: p.data,
        demo: l.demo || r.demo || p.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : '医技看板加载失败',
      });
    }
  },
}));
