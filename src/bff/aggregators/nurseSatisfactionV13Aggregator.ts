/**
 * 健澜科技 jlmedaios - 护士满意度调研 V13 纯函数（M332-C）
 *
 * computeNurseSatisfactionV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 护士满意度调研 */
export interface NurseSatisfactionSurveyV13 {
  salary: number;
  scheduling: number;
  workEnvironment: number;
}

/** 维度均分项 */
export interface NurseSatisfactionDimensionV13 {
  dimension: string;
  score: number;
}

/**
 * 三维度均分（纯函数）：薪酬/排班/工作环境，保留 1 位小数。
 *
 * @param surveys 调研列表
 * @returns 三维度均分
 */
export function computeNurseSatisfactionV13(surveys: NurseSatisfactionSurveyV13[]): NurseSatisfactionDimensionV13[] {
  if (surveys.length === 0) return [];
  const avg = (getter: (s: NurseSatisfactionSurveyV13) => number): number => {
    const total = surveys.reduce((acc, s) => acc + getter(s), 0);
    return Math.round((total / surveys.length) * 10) / 10;
  };
  return [
    { dimension: "薪酬", score: avg((s) => s.salary) },
    { dimension: "排班", score: avg((s) => s.scheduling) },
    { dimension: "工作环境", score: avg((s) => s.workEnvironment) },
  ];
}
