/**
 * 健澜科技 jlmedaios - 医生满意度调研 V13 纯函数（M332-B）
 *
 * computeDoctorSatisfactionV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医生满意度调研 */
export interface DoctorSatisfactionSurveyV13 {
  salary: number;
  workPressure: number;
  careerDevelopment: number;
}

/** 维度均分项 */
export interface DoctorSatisfactionDimensionV13 {
  dimension: string;
  score: number;
}

/**
 * 三维度均分（纯函数）：薪酬/工作压力/职业发展，保留 1 位小数。
 *
 * @param surveys 调研列表
 * @returns 三维度均分
 */
export function computeDoctorSatisfactionV13(surveys: DoctorSatisfactionSurveyV13[]): DoctorSatisfactionDimensionV13[] {
  if (surveys.length === 0) return [];
  const avg = (getter: (s: DoctorSatisfactionSurveyV13) => number): number => {
    const total = surveys.reduce((acc, s) => acc + getter(s), 0);
    return Math.round((total / surveys.length) * 10) / 10;
  };
  return [
    { dimension: "薪酬", score: avg((s) => s.salary) },
    { dimension: "工作压力", score: avg((s) => s.workPressure) },
    { dimension: "职业发展", score: avg((s) => s.careerDevelopment) },
  ];
}
