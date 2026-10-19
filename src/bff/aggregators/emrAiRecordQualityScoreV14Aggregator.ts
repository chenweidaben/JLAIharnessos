/**
 * 健澜科技 jlmedaios - 病历AI病案质量评分 V14 聚合器（M556-B）
 *
 * 纯函数：构建 AI 病案质量评分基础数据 + AI 病案质量评分 + 构建病案质量评分报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 病案质量评分基础数据 */
export interface AiRecordQualityScoreV14 {
  recordId: string;
  dept: string;
}

/** AI 病案质量评分输入 */
export interface AiRecordQualityScoreInputV14 {
  completeness: number;
  accuracy: number;
  timeliness: number;
}

/** AI 病案质量评分结果 */
export interface AiRecordQualityScoreResultV14 {
  totalScore: number;
  grade: string;
}

/** 病案质量评分报告 */
export interface AiRecordQualityScoreReportV14 {
  totalScore: number;
  grade: string;
}

/**
 * 构建 AI 病案质量评分基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 病案质量评分基础数据
 */
export function buildAiRecordQualityScore(recordId: string, dept: string): AiRecordQualityScoreV14 {
  return { recordId, dept };
}

/**
 * AI 病案质量评分。
 * totalScore = Math.round(completeness * 0.4 + accuracy * 0.4 + timeliness * 0.2)
 * grade = totalScore >= 90 ? '优秀' : totalScore >= 80 ? '良好' : totalScore >= 70 ? '合格' : '不合格'
 *
 * @param input 质量评分输入（完整度 + 准确率 + 及时率）
 * @returns 质量评分结果（totalScore + grade）
 */
export function scoreRecordQualityByAi(input: AiRecordQualityScoreInputV14): AiRecordQualityScoreResultV14 {
  // 手算：totalScore = Math.round(completeness * 0.4 + accuracy * 0.4 + timeliness * 0.2)
  // 测试2：completeness=95, accuracy=90, timeliness=85
  //   = Math.round(95*0.4 + 90*0.4 + 85*0.2) = Math.round(38 + 36 + 17) = Math.round(91) = 91
  // 测试3：completeness=75, accuracy=70, timeliness=80
  //   = Math.round(75*0.4 + 70*0.4 + 80*0.2) = Math.round(30 + 28 + 16) = Math.round(74) = 74
  //   （规格原写 73 有误，按公式实际修正为 74）
  const totalScore = Math.round(input.completeness * 0.4 + input.accuracy * 0.4 + input.timeliness * 0.2);
  // 手算：grade = totalScore >= 90 ? '优秀' : totalScore >= 80 ? '良好' : totalScore >= 70 ? '合格' : '不合格'
  // 测试2：totalScore=91 >= 90 → grade='优秀'
  // 测试3：totalScore=74 >= 70, < 80 → grade='合格'
  const grade = totalScore >= 90 ? "优秀" : totalScore >= 80 ? "良好" : totalScore >= 70 ? "合格" : "不合格";
  return { totalScore, grade };
}

/**
 * 构建病案质量评分报告。
 *
 * @param result 质量评分结果
 * @returns 质量评分报告（totalScore + grade 透传）
 */
export function buildAiRecordQualityScoreReport(result: AiRecordQualityScoreResultV14): AiRecordQualityScoreReportV14 {
  // 手算：透传 totalScore + grade
  // 测试4：{totalScore=91, grade='优秀'} → 透传
  return { totalScore: result.totalScore, grade: result.grade };
}
