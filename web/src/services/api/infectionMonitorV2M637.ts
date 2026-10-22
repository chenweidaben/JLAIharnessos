/**
 * 健澜科技 jlmedaios - 院感监测趋势 v2 API（M637，配套 M606）
 *
 * 对接 BFF：GET /api/v1/infection/trends
 *   （7 天院感趋势 + 科室感染率排名 + 手卫生依从性）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface InfectionTrendPoint {
  date: string;
  infections: number;
  admissions: number;
}

export interface DeptInfectionRate {
  deptCode: string;
  deptName: string;
  infectionRatePct: number;
}

export interface HandHygiene {
  overallPct: number;
  byRole: Array<{ role: string; pct: number }>;
}

export interface InfectionTrendBundle {
  trend: InfectionTrendPoint[];
  deptRank: DeptInfectionRate[];
  handHygiene: HandHygiene;
}

const DEMO_BUNDLE: InfectionTrendBundle = {
  trend: [
    { date: '2026-10-16', infections: 1, admissions: 120 },
    { date: '2026-10-17', infections: 0, admissions: 118 },
    { date: '2026-10-18', infections: 2, admissions: 125 },
    { date: '2026-10-19', infections: 1, admissions: 130 },
    { date: '2026-10-20', infections: 3, admissions: 128 },
    { date: '2026-10-21', infections: 2, admissions: 122 },
    { date: '2026-10-22', infections: 1, admissions: 126 },
  ],
  deptRank: [
    { deptCode: 'ICU', deptName: 'ICU', infectionRatePct: 4.8 },
    { deptCode: 'WARD-A', deptName: '呼吸一科', infectionRatePct: 2.6 },
    { deptCode: 'WARD-B', deptName: '普外科', infectionRatePct: 1.4 },
    { deptCode: 'WARD-C', deptName: '神经内科', infectionRatePct: 0.9 },
    { deptCode: 'PEDI', deptName: '儿科', infectionRatePct: 0.5 },
  ],
  handHygiene: {
    overallPct: 86.5,
    byRole: [
      { role: '医师', pct: 82 },
      { role: '护士', pct: 91 },
      { role: '护工', pct: 75 },
    ],
  },
};

export async function fetchInfectionTrends(): Promise<InfectionTrendBundle & { demo: boolean }> {
  try {
    const res = await get<InfectionTrendBundle>('/infection/trends');
    return { ...res, demo: false };
  } catch {
    return { ...DEMO_BUNDLE, demo: true };
  }
}
