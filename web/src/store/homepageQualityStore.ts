/**
 * 健澜科技 jlmedaios - 病案首页质量看板 Zustand store（M488）
 * 聚合 /emr/homepage-* 与 /drg//dip 四端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchDrgGroups,
  fetchDipPoints,
  fetchItems,
  fetchQuality,
  type DefectItemRow,
  type DipPointRow,
  type DrgGroupRow,
  type QualityOverview,
} from '@/services/api/homepageQualityBoard';

interface HomepageQualityState {
  overview: QualityOverview | null;
  defects: DefectItemRow[];
  drg: DrgGroupRow[];
  dip: DipPointRow[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useHomepageQualityStore = create<HomepageQualityState>((set) => ({
  overview: null,
  defects: [],
  drg: [],
  dip: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [o, d, g, p] = await Promise.all([
        fetchQuality(),
        fetchItems(),
        fetchDrgGroups(),
        fetchDipPoints(),
      ]);
      set({
        overview: o.data,
        defects: d.data,
        drg: g.data,
        dip: p.data,
        demo: o.demo || d.demo || g.demo || p.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : '首页质量看板加载失败',
      });
    }
  },
}));
