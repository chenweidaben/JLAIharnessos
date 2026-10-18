/**
 * 健澜科技 jlmedaios - AI病历质量预测 V14 聚合器（M522-B）
 *
 * 纯函数：构建质量预测基础数据 + 预测质量分 + 构建预测报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 质量预测基础数据 */
export interface AiQualityPredictV14 {
  recordId: string;
  recordType: string;
}

/** 预测输入 */
export interface AiQualityPredictInputV14 {
  completeness: number;
  timeliness: number;
  accuracy: number;
}

/** 预测结果 */
export interface AiQualityPredictResultV14 {
  score: number;
  grade: string;
}

/** 预测报告 */
export interface AiQualityPredictReportV14 {
  score: number;
  grade: string;
}

/**
 * 构建质量预测基础数据。
 *
 * @param recordId 记录ID
 * @param recordType 病历类型
 * @returns 质量预测基础数据
 */
export function buildAiQualityPredict(recordId: string, recordType: string): AiQualityPredictV14 {
  return { recordId, recordType };
}

/**
 * 预测质量分。
 * score = (completeness + timeliness + accuracy) / 3，clamp 0-100，保留 1 位小数；
 * score >= 90 → '优'，>= 80 → '良'，>= 70 → '中'，否则 '差'。
 *
 * @param input 预测输入（完整性/及时性/准确性）
 * @returns 预测结果（score + grade）
 */
export function predictQualityScore(input: AiQualityPredictInputV14): AiQualityPredictResultV14 {
  // 手算：score = (completeness + timeliness + accuracy) / 3
  // 测试2：(90+85+92)/3 = 267/3 = 89.0
  // 测试3：(95+98+97)/3 = 290/3 = 96.666... → 保留1位 = 96.7
  // 测试4：(60+55+65)/3 = 180/3 = 60.0
  const raw = (input.completeness + input.timeliness + input.accuracy) / 3;
  // clamp 0-100
  const clamped = Math.max(0, Math.min(100, raw));
  // 保留 1 位小数
  const score = Math.round(clamped * 10) / 10;
  // 手算：grade 分级
  // 测试2：89.0 >= 80 → '良'
  // 测试3：96.7 >= 90 → '优'
  // 测试4：60.0 < 70 → '差'
  let grade: string;
  if (score >= 90) {
    grade = "优";
  } else if (score >= 80) {
    grade = "良";
  } else if (score >= 70) {
    grade = "中";
  } else {
    grade = "差";
  }
  return { score, grade };
}

/**
 * 构建预测报告。
 *
 * @param result 预测结果
 * @returns 预测报告（score + grade）
 */
export function buildAiQualityPredictReport(result: AiQualityPredictResultV14): AiQualityPredictReportV14 {
  return { score: result.score, grade: result.grade };
}
