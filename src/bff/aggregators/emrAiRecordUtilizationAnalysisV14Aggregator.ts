/**
 * 健澜科技 jlmedaios - 病历AI病案利用分析 V14 聚合器（M556-D，M556 收官）
 *
 * 纯函数：构建 AI 病案利用分析基础数据 + AI 病案利用分析 + 构建病案利用分析报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 病案利用分析基础数据 */
export interface AiRecordUtilizationAnalysisV14 {
  recordId: string;
  dept: string;
}

/** AI 病案利用分析输入 */
export interface AiRecordUtilizationAnalysisInputV14 {
  totalRecords: number;
  borrowedRecords: number;
  referencedRecords: number;
}

/** AI 病案利用分析结果 */
export interface AiRecordUtilizationAnalysisResultV14 {
  borrowRate: number;
  referRate: number;
  utilizationLevel: string;
}

/** 病案利用分析报告 */
export interface AiRecordUtilizationAnalysisReportV14 {
  borrowRate: number;
  referRate: number;
  utilizationLevel: string;
}

/**
 * 构建 AI 病案利用分析基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 病案利用分析基础数据
 */
export function buildAiRecordUtilizationAnalysis(recordId: string, dept: string): AiRecordUtilizationAnalysisV14 {
  return { recordId, dept };
}

/**
 * AI 病案利用分析。
 * borrowRate = Math.round(borrowedRecords / totalRecords * 1000) / 10
 * referRate = Math.round(referencedRecords / totalRecords * 1000) / 10
 * utilizationLevel = (borrowRate + referRate) >= 30 ? '高利用'
 *   : (borrowRate + referRate) >= 10 ? '中利用' : '低利用'
 *
 * @param input 利用分析输入（总病历数 + 借阅数 + 调阅数）
 * @returns 利用分析结果（borrowRate + referRate + utilizationLevel）
 */
export function analyzeRecordUtilizationByAi(input: AiRecordUtilizationAnalysisInputV14): AiRecordUtilizationAnalysisResultV14 {
  // 手算：borrowRate = Math.round(borrowedRecords / totalRecords * 1000) / 10
  // 测试2：borrowedRecords=200, totalRecords=1000 → Math.round(200/1000*1000)/10 = Math.round(200)/10 = 20.0
  // 测试3：borrowedRecords=30, totalRecords=1000 → Math.round(30/1000*1000)/10 = Math.round(30)/10 = 3.0
  const borrowRate = Math.round((input.borrowedRecords / input.totalRecords) * 1000) / 10;
  // 手算：referRate = Math.round(referencedRecords / totalRecords * 1000) / 10
  // 测试2：referencedRecords=150, totalRecords=1000 → Math.round(150/1000*1000)/10 = Math.round(150)/10 = 15.0
  // 测试3：referencedRecords=20, totalRecords=1000 → Math.round(20/1000*1000)/10 = Math.round(20)/10 = 2.0
  const referRate = Math.round((input.referencedRecords / input.totalRecords) * 1000) / 10;
  // 手算：utilizationLevel = (borrowRate + referRate) >= 30 ? '高利用'
  //   : (borrowRate + referRate) >= 10 ? '中利用' : '低利用'
  // 测试2：20.0 + 15.0 = 35 >= 30 → '高利用'
  // 测试3：3.0 + 2.0 = 5 < 10 → '低利用'
  const sum = borrowRate + referRate;
  const utilizationLevel = sum >= 30 ? "高利用" : sum >= 10 ? "中利用" : "低利用";
  return { borrowRate, referRate, utilizationLevel };
}

/**
 * 构建病案利用分析报告。
 *
 * @param result 利用分析结果
 * @returns 利用分析报告（borrowRate + referRate + utilizationLevel 透传）
 */
export function buildAiRecordUtilizationAnalysisReport(result: AiRecordUtilizationAnalysisResultV14): AiRecordUtilizationAnalysisReportV14 {
  // 手算：透传 borrowRate + referRate + utilizationLevel
  // 测试4：{borrowRate=20.0, referRate=15.0, utilizationLevel='高利用'} → 透传
  return { borrowRate: result.borrowRate, referRate: result.referRate, utilizationLevel: result.utilizationLevel };
}
