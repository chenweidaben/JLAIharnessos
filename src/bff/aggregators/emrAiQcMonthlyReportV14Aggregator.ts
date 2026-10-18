/**
 * 健澜科技 jlmedaios - 病历AI质控月报生成 V14 聚合器（M548-B）
 *
 * 纯函数：构建 AI 质控月报基础数据 + AI 质控月报生成 + 构建月报报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 质控月报基础数据 */
export interface AiQcMonthlyReportV14 {
  recordId: string;
  dept: string;
}

/** AI 质控月报生成输入 */
export interface AiQcMonthlyReportInputV14 {
  totalRecords: number;
  defectCount: number;
  deptCount: number;
}

/** AI 质控月报生成结果 */
export interface AiQcMonthlyReportResultV14 {
  passRate: number;
  trend: string;
  summary: string;
}

/** 月报报告 */
export interface AiQcMonthlyReportReportV14 {
  passRate: number;
  trend: string;
  summary: string;
}

/**
 * 构建 AI 质控月报基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 质控月报基础数据
 */
export function buildAiQcMonthlyReport(recordId: string, dept: string): AiQcMonthlyReportV14 {
  return { recordId, dept };
}

/**
 * AI 质控月报生成。
 * passRate = Math.round((totalRecords - defectCount) / totalRecords * 1000) / 10
 * trend = passRate >= 90 ? '上升' : passRate >= 80 ? '平稳' : '下降'
 * summary = `本月抽查${totalRecords}份病历，覆盖${deptCount}个科室，缺陷${defectCount}份，合格率${passRate}%，趋势${trend}`
 *
 * @param input 月报输入（抽查总数 + 缺陷数 + 覆盖科室数）
 * @returns 月报结果（passRate + trend + summary）
 */
export function generateQcMonthlyReportByAi(input: AiQcMonthlyReportInputV14): AiQcMonthlyReportResultV14 {
  // 手算：passRate = Math.round((totalRecords - defectCount) / totalRecords * 1000) / 10
  // 测试2：totalRecords=500, defectCount=30 → (500-30)/500*1000 = 470/500*1000 = 940 → Math.round(940)=940 → 940/10 = 94.0
  // 测试3：totalRecords=300, defectCount=80 → (300-80)/300*1000 = 220/300*1000 = 733.33... → Math.round(733.33)=733 → 733/10 = 73.3
  const passRate = Math.round(((input.totalRecords - input.defectCount) / input.totalRecords) * 1000) / 10;
  // 手算：trend = passRate >= 90 ? '上升' : passRate >= 80 ? '平稳' : '下降'
  // 测试2：passRate=94.0 → 94>=90 → trend='上升'
  // 测试3：passRate=73.3 → 73.3<80 → trend='下降'
  const trend = passRate >= 90 ? "上升" : passRate >= 80 ? "平稳" : "下降";
  // 手算：summary = `本月抽查${totalRecords}份病历，覆盖${deptCount}个科室，缺陷${defectCount}份，合格率${passRate}%，趋势${trend}`
  // 测试2：本月抽查500份病历，覆盖12个科室，缺陷30份，合格率94%，趋势上升
  // 测试3：本月抽查300份病历，覆盖8个科室，缺陷80份，合格率73.3%，趋势下降
  const summary = `本月抽查${input.totalRecords}份病历，覆盖${input.deptCount}个科室，缺陷${input.defectCount}份，合格率${passRate}%，趋势${trend}`;
  return { passRate, trend, summary };
}

/**
 * 构建月报报告。
 *
 * @param result 月报结果
 * @returns 月报报告（passRate + trend + summary 透传）
 */
export function buildAiQcMonthlyReportReport(result: AiQcMonthlyReportResultV14): AiQcMonthlyReportReportV14 {
  // 手算：透传 passRate + trend + summary
  // 测试4：{passRate=94.0, trend='上升', summary='本月抽查500份病历，覆盖12个科室，缺陷30份，合格率94%，趋势上升'} → 透传
  return { passRate: result.passRate, trend: result.trend, summary: result.summary };
}
