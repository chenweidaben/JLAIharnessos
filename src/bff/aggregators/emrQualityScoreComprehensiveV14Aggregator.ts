/**
 * 健澜科技 jlmedaios - 病历质量综合评分 V14 聚合器（M536-A）
 *
 * 纯函数：构建质量综合评分基础数据 + 质量综合评分 + 构建评分报告。
 * 避让 M465-B 旧 emrQualityScoreV14（实时评分仪表盘），采用 -comprehensive 后缀。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 质量综合评分基础数据 */
export interface QualityScoreComprehensiveV14 {
  recordId: string;
  dept: string;
}

/** 质量综合评分输入 */
export interface QualityScoreComprehensiveInputV14 {
  block: number;
  major: number;
  minor: number;
}

/** 质量综合评分结果 */
export interface QualityScoreComprehensiveResultV14 {
  score: number;
  grade: string;
}

/** 质量综合评分报告 */
export interface QualityScoreComprehensiveReportV14 {
  score: number;
  grade: string;
}

/**
 * 构建质量综合评分基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns 质量综合评分基础数据
 */
export function buildQualityScoreComprehensive(recordId: string, dept: string): QualityScoreComprehensiveV14 {
  return { recordId, dept };
}

/**
 * 质量综合评分。
 * 扣分 = block × 15 + major × 8 + minor × 3
 * score = Math.max(0, Math.min(100, 100 - 扣分))
 * grade = score >= 90 ? '优秀' : score >= 80 ? '良好' : score >= 70 ? '合格' : '不合格'
 *
 * @param input 评分输入（阻断项数 + 主要缺陷数 + 次要缺陷数）
 * @returns 评分结果（score + grade）
 */
export function computeQualityScoreComprehensive(input: QualityScoreComprehensiveInputV14): QualityScoreComprehensiveResultV14 {
  // 手算：扣分 = block × 15 + major × 8 + minor × 3
  // 测试2：block=0, major=0, minor=1 → 扣分 = 0×15 + 0×8 + 1×3 = 3
  // 测试3：block=2, major=3, minor=5 → 扣分 = 2×15 + 3×8 + 5×3 = 30 + 24 + 15 = 69
  const deduction = input.block * 15 + input.major * 8 + input.minor * 3;
  // 手算：score = clamp(100 - 扣分, 0, 100)
  // 测试2：100 - 3 = 97
  // 测试3：100 - 69 = 31
  const score = Math.max(0, Math.min(100, 100 - deduction));
  // 手算：grade = >=90优秀 / >=80良好 / >=70合格 / 否则不合格
  // 测试2：score=97 >= 90 → '优秀'
  // 测试3：score=31 < 70 → '不合格'
  const grade = score >= 90 ? "优秀" : score >= 80 ? "良好" : score >= 70 ? "合格" : "不合格";
  return { score, grade };
}

/**
 * 构建评分报告。
 *
 * @param result 评分结果
 * @returns 评分报告（score + grade 透传）
 */
export function buildQualityScoreComprehensiveReport(result: QualityScoreComprehensiveResultV14): QualityScoreComprehensiveReportV14 {
  // 手算：透传 score + grade
  // 测试4：{score=97, grade='优秀'} → score=97, grade='优秀'
  return { score: result.score, grade: result.grade };
}
