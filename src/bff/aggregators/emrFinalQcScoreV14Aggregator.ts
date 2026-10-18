/**
 * 健澜科技 jlmedaios - 病历终末质控评分 V14 聚合器（M527-B）
 *
 * 纯函数：构建终末评分基础数据 + 终末评分 + 构建评分报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 终末评分基础数据 */
export interface FinalQcScoreV14 {
  recordId: string;
  dept: string;
}

/** 终末评分输入 */
export interface FinalQcScoreInputV14 {
  blockDefects: number;
  majorDefects: number;
  minorDefects: number;
}

/** 终末评分结果 */
export interface FinalQcScoreResultV14 {
  finalScore: number;
  grade: string;
}

/** 终末评分报告 */
export interface FinalQcScoreReportV14 {
  finalScore: number;
  grade: string;
}

/**
 * 构建终末评分基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns 终末评分基础数据
 */
export function buildFinalQcScore(recordId: string, dept: string): FinalQcScoreV14 {
  return { recordId, dept };
}

/**
 * 终末评分。
 * 扣分 = block×15 + major×8 + minor×3；finalScore = Math.max(0, 100 - 扣分)；
 * grade >= 90 → '优秀'，>= 80 → '良好'，>= 70 → '合格'，否则 '不合格'。
 *
 * @param input 终末评分输入（阻断缺陷数 + 主要缺陷数 + 次要缺陷数）
 * @returns 评分结果（finalScore + grade）
 */
export function calculateFinalScore(input: FinalQcScoreInputV14): FinalQcScoreResultV14 {
  // 手算：扣分 = block×15 + major×8 + minor×3
  // 测试2：block=0, major=0, minor=1 → 0×15+0×8+1×3 = 3
  // 测试3：block=2, major=3, minor=5 → 2×15+3×8+5×3 = 30+24+15 = 69
  const deduction = input.blockDefects * 15 + input.majorDefects * 8 + input.minorDefects * 3;
  // 手算：finalScore = Math.max(0, 100 - 扣分)
  // 测试2：Math.max(0, 100-3) = 97
  // 测试3：Math.max(0, 100-69) = 31
  const finalScore = Math.max(0, 100 - deduction);
  // 手算：grade >= 90 → '优秀'，>= 80 → '良好'，>= 70 → '合格'，否则 '不合格'
  // 测试2：97 >= 90 → '优秀'
  // 测试3：31 < 70 → '不合格'
  let grade: string;
  if (finalScore >= 90) {
    grade = "优秀";
  } else if (finalScore >= 80) {
    grade = "良好";
  } else if (finalScore >= 70) {
    grade = "合格";
  } else {
    grade = "不合格";
  }
  return { finalScore, grade };
}

/**
 * 构建评分报告。
 *
 * @param result 评分结果
 * @returns 评分报告（finalScore + grade 透传）
 */
export function buildFinalQcScoreReport(result: FinalQcScoreResultV14): FinalQcScoreReportV14 {
  // 手算：透传 finalScore + grade
  // 测试4：{finalScore:97, grade:'优秀'} → finalScore=97, grade='优秀'
  return { finalScore: result.finalScore, grade: result.grade };
}
