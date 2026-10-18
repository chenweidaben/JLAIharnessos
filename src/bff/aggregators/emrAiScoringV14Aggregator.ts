/**
 * 健澜科技 jlmedaios - 病历AI质控评分 V14 聚合器（M543-B）
 *
 * 纯函数：构建 AI 评分基础数据 + AI 质控评分 + 构建评分报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 评分基础数据 */
export interface AiScoringV14 {
  recordId: string;
  dept: string;
}

/** AI 质控评分输入 */
export interface AiScoringInputV14 {
  block: number;
  major: number;
  minor: number;
}

/** AI 质控评分结果 */
export interface AiScoringResultV14 {
  aiScore: number;
  aiGrade: string;
}

/** 评分报告 */
export interface AiScoringReportV14 {
  aiScore: number;
  aiGrade: string;
}

/**
 * 构建 AI 评分基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 评分基础数据
 */
export function buildAiScoring(recordId: string, dept: string): AiScoringV14 {
  return { recordId, dept };
}

/**
 * AI 质控评分。
 * 扣分 = block×15 + major×8 + minor×3
 * aiScore = Math.max(0, Math.min(100, 100 - 扣分))
 * aiGrade = aiScore>=90 ? '优秀' : aiScore>=80 ? '良好' : aiScore>=70 ? '合格' : '不合格'
 *
 * @param input 评分输入（阻断项数 + 主要缺陷数 + 次要缺陷数）
 * @returns 评分结果（aiScore + aiGrade）
 */
export function scoreByAi(input: AiScoringInputV14): AiScoringResultV14 {
  // 手算：扣分 = block×15 + major×8 + minor×3
  // 测试2：block=0, major=0, minor=1 → 0×15 + 0×8 + 1×3 = 3
  // 测试3：block=2, major=3, minor=5 → 2×15 + 3×8 + 5×3 = 30 + 24 + 15 = 69
  const deduction = input.block * 15 + input.major * 8 + input.minor * 3;
  // 手算：aiScore = Math.max(0, Math.min(100, 100 - 扣分))
  // 测试2：100 - 3 = 97 → clamp [0,100] → 97
  // 测试3：100 - 69 = 31 → clamp [0,100] → 31
  const aiScore = Math.max(0, Math.min(100, 100 - deduction));
  // 手算：aiGrade = aiScore>=90 ? '优秀' : aiScore>=80 ? '良好' : aiScore>=70 ? '合格' : '不合格'
  // 测试2：aiScore=97 → 97>=90 → '优秀'
  // 测试3：aiScore=31 → 31<70 → '不合格'
  const aiGrade = aiScore >= 90 ? "优秀" : aiScore >= 80 ? "良好" : aiScore >= 70 ? "合格" : "不合格";
  return { aiScore, aiGrade };
}

/**
 * 构建评分报告。
 *
 * @param result 评分结果
 * @returns 评分报告（aiScore + aiGrade 透传）
 */
export function buildAiScoringReport(result: AiScoringResultV14): AiScoringReportV14 {
  // 手算：透传 aiScore + aiGrade
  // 测试4：{aiScore=97, aiGrade='优秀'} → aiScore=97, aiGrade='优秀'
  return { aiScore: result.aiScore, aiGrade: result.aiGrade };
}
