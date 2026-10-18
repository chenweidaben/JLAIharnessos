/**
 * 健澜科技 jlmedaios - 质控患者满意度调查 V14 聚合器（M504-D，M504 收官）
 *
 * 纯函数：满意度调查构建 + 调查提交 + 满意度聚合。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 满意度调查 */
export interface PatientSurveyV14 {
  patient: string;
  score: number;
  comment: string;
}

/** 聚合结果 */
export interface SatisfactionAggregateV14 {
  total: number;
  avgScore: number;
  rate: number;
}

/**
 * 构建满意度调查。
 *
 * @param patient 患者姓名
 * @param score 满意度评分
 * @param comment 评语
 * @returns 满意度调查
 */
export function buildSurvey(patient: string, score: number, comment: string): PatientSurveyV14 {
  return { patient, score, comment };
}

/**
 * 提交调查。
 *
 * @param surveys 调查数组
 * @param survey 新调查
 * @returns 新调查数组（长度+1）
 */
export function submitSurvey(surveys: PatientSurveyV14[], survey: PatientSurveyV14): PatientSurveyV14[] {
  // 手算 submit：返回新数组长度+1
  return [...surveys, survey];
}

/**
 * 聚合满意度（总份数 + 平均分 + 满意度%）。
 *
 * @param surveys 调查数组
 * @returns 聚合结果
 */
export function aggregateSatisfaction(surveys: PatientSurveyV14[]): SatisfactionAggregateV14 {
  if (surveys.length === 0) {
    return { total: 0, avgScore: 0, rate: 0 };
  }
  // 手算 avgScore：所有评分之和 / 份数，保留 1 位小数
  const sum = surveys.reduce((acc, s) => acc + s.score, 0);
  const avgScore = Math.round((sum / surveys.length) * 10) / 10;
  // 手算 rate：>=90 的份数 / 总份数 * 100，Math.ceil
  const satisfiedCount = surveys.filter((s) => s.score >= 90).length;
  const rate = Math.ceil((satisfiedCount / surveys.length) * 100);
  return { total: surveys.length, avgScore, rate };
}
