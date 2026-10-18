/**
 * 健澜科技 jlmedaios - 病历AI质控周报生成 V14 聚合器（M548-A）
 *
 * 纯函数：构建 AI 质控周报基础数据 + AI 质控周报生成 + 构建周报报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 质控周报基础数据 */
export interface AiQcWeeklyReportV14 {
  recordId: string;
  dept: string;
}

/** AI 质控周报生成输入 */
export interface AiQcWeeklyReportInputV14 {
  totalRecords: number;
  defectCount: number;
}

/** AI 质控周报生成结果 */
export interface AiQcWeeklyReportResultV14 {
  passRate: number;
  summary: string;
}

/** 周报报告 */
export interface AiQcWeeklyReportReportV14 {
  passRate: number;
  summary: string;
}

/**
 * 构建 AI 质控周报基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 质控周报基础数据
 */
export function buildAiQcWeeklyReport(recordId: string, dept: string): AiQcWeeklyReportV14 {
  return { recordId, dept };
}

/**
 * AI 质控周报生成。
 * passRate = Math.round((totalRecords - defectCount) / totalRecords * 1000) / 10
 * summary = `本周抽查${totalRecords}份病历，缺陷${defectCount}份，合格率${passRate}%`
 *
 * @param input 周报输入（抽查总数 + 缺陷数）
 * @returns 周报结果（passRate + summary）
 */
export function generateQcWeeklyReportByAi(input: AiQcWeeklyReportInputV14): AiQcWeeklyReportResultV14 {
  // 手算：passRate = Math.round((totalRecords - defectCount) / totalRecords * 1000) / 10
  // 测试2：totalRecords=100, defectCount=5 → (100-5)/100*1000 = 950 → Math.round(950)=950 → 950/10 = 95.0
  // 测试3：totalRecords=50, defectCount=10 → (50-10)/50*1000 = 800 → Math.round(800)=800 → 800/10 = 80.0
  const passRate = Math.round(((input.totalRecords - input.defectCount) / input.totalRecords) * 1000) / 10;
  // 手算：summary = `本周抽查${totalRecords}份病历，缺陷${defectCount}份，合格率${passRate}%`
  // 测试2：本周抽查100份病历，缺陷5份，合格率95%
  // 测试3：本周抽查50份病历，缺陷10份，合格率80%
  const summary = `本周抽查${input.totalRecords}份病历，缺陷${input.defectCount}份，合格率${passRate}%`;
  return { passRate, summary };
}

/**
 * 构建周报报告。
 *
 * @param result 周报结果
 * @returns 周报报告（passRate + summary 透传）
 */
export function buildAiQcWeeklyReportReport(result: AiQcWeeklyReportResultV14): AiQcWeeklyReportReportV14 {
  // 手算：透传 passRate + summary
  // 测试4：{passRate=95.0, summary='本周抽查100份病历，缺陷5份，合格率95%'} → 透传
  return { passRate: result.passRate, summary: result.summary };
}
