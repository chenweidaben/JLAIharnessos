/**
 * 健澜科技 jlmedaios - 病历质控看板 Zustand store（M473）
 *
 * 聚合 /emr-quality/* 四端点：缺陷清单 / 甲/乙/丙级率 / 缺陷类型 / 科室排名。
 * BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchDeptRanking,
  fetchDefectTypes,
  fetchEmrQualityDefects,
  fetchGradeRate,
  type DeptRankingRow,
  type DefectTypeRow,
  type EmrDefectRow,
  type GradeRateRow,
} from '@/services/api/emrQuality';

interface EmrQualityState {
  defects: EmrDefectRow[];
  gradeRate: GradeRateRow[];
  defectTypes: DefectTypeRow[];
  deptRanking: DeptRankingRow[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const useEmrQualityStore = create<EmrQualityState>((set) => ({
  defects: [],
  gradeRate: [],
  defectTypes: [],
  deptRanking: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [d, g, t, r] = await Promise.all([
        fetchEmrQualityDefects(),
        fetchGradeRate(),
        fetchDefectTypes(),
        fetchDeptRanking(),
      ]);
      set({
        defects: d.data,
        gradeRate: g.data,
        defectTypes: t.data,
        deptRanking: r.data,
        demo: d.demo || g.demo || t.demo || r.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : '病历质控看板加载失败',
      });
    }
  },
}));
