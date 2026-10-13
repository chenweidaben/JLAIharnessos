/**
 * 健澜科技 jlmedaios - 患者满意度纯函数（M63-A）
 * 维度均分 / 科室排名 / 低分维度。纯函数无 DB。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export interface SurveyScores {
  medical: number;
  nursing: number;
  logistics: number;
  environment: number;
}

export type DimensionKey = keyof SurveyScores;

export const DIMENSION_LABEL: Record<DimensionKey, string> = {
  medical: '医疗',
  nursing: '护理',
  logistics: '后勤',
  environment: '环境',
};

/** 四维度均分（0-5）。 */
export function dimensionAverage(s: SurveyScores): number {
  const sum = s.medical + s.nursing + s.logistics + s.environment;
  return Math.round((sum / 4) * 100) / 100;
}

export interface SurveyRow extends SurveyScores {
  department: string;
}

export interface DepartmentRank {
  department: string;
  avg: number;
  count: number;
}

/** 按科室均分降序。 */
export function departmentRanking(rows: SurveyRow[]): DepartmentRank[] {
  const by = new Map<string, { sum: number; count: number }>();
  for (const r of rows) {
    const cur = by.get(r.department) ?? { sum: 0, count: 0 };
    cur.sum += dimensionAverage(r);
    cur.count += 1;
    by.set(r.department, cur);
  }
  return [...by.entries()]
    .map(([department, v]) => ({
      department,
      avg: Math.round((v.sum / v.count) * 100) / 100,
      count: v.count,
    }))
    .sort((a, b) => b.avg - a.avg);
}

/** 均分 < threshold 的维度列表（默认 3.5）。 */
export function lowDimension(s: SurveyScores, threshold = 3.5): DimensionKey[] {
  return (Object.keys(s) as DimensionKey[]).filter((k) => s[k] < threshold);
}
