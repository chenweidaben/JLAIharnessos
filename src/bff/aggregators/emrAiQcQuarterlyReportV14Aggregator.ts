/**
 * 健澜科技 jlmedaios - 病历AI质控季报生成 V14 聚合器（M548-C）
 *
 * 纯函数：构建 AI 质控季报基础数据 + AI 质控季报生成 + 构建季报报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 质控季报基础数据 */
export interface AiQcQuarterlyReportV14 {
  recordId: string;
  dept: string;
}

/** AI 质控季报生成输入 */
export interface AiQcQuarterlyReportInputV14 {
  totalRecords: number;
  defectCount: number;
  topDept: string;
}

/** AI 质控季报生成结果 */
export interface AiQcQuarterlyReportResultV14 {
  passRate: number;
  grade: string;
  summary: string;
}

/** 季报报告 */
export interface AiQcQuarterlyReportReportV14 {
  passRate: number;
  grade: string;
  summary: string;
}

/**
 * 构建 AI 质控季报基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 质控季报基础数据
 */
export function buildAiQcQuarterlyReport(recordId: string, dept: string): AiQcQuarterlyReportV14 {
  return { recordId, dept };
}

/**
 * AI 质控季报生成。
 * passRate = Math.round((totalRecords - defectCount) / totalRecords * 1000) / 10
 * grade = passRate >= 90 ? '优秀' : passRate >= 80 ? '良好' : '待改进'
 * summary = `本季度抽查${totalRecords}份病历，缺陷${defectCount}份，合格率${passRate}%，评级${grade}，重点关注${topDept}`
 *
 * @param input 季报输入（抽查总数 + 缺陷数 + 重点关注科室）
 * @returns 季报结果（passRate + grade + summary）
 */
export function generateQcQuarterlyReportByAi(input: AiQcQuarterlyReportInputV14): AiQcQuarterlyReportResultV14 {
  // 手算：passRate = Math.round((totalRecords - defectCount) / totalRecords * 1000) / 10
  // 测试2：totalRecords=1500, defectCount=90 → (1500-90)/1500*1000 = 1410/1500*1000 = 940 → Math.round(940)=940 → 940/10 = 94.0
  // 测试3：totalRecords=1200, defectCount=300 → (1200-300)/1200*1000 = 900/1200*1000 = 750 → Math.round(750)=750 → 750/10 = 75.0
  const passRate = Math.round(((input.totalRecords - input.defectCount) / input.totalRecords) * 1000) / 10;
  // 手算：grade = passRate >= 90 ? '优秀' : passRate >= 80 ? '良好' : '待改进'
  // 测试2：passRate=94.0 → 94>=90 → grade='优秀'
  // 测试3：passRate=75.0 → 75<80 → grade='待改进'
  const grade = passRate >= 90 ? "优秀" : passRate >= 80 ? "良好" : "待改进";
  // 手算：summary = `本季度抽查${totalRecords}份病历，缺陷${defectCount}份，合格率${passRate}%，评级${grade}，重点关注${topDept}`
  // 测试2：本季度抽查1500份病历，缺陷90份，合格率94%，评级优秀，重点关注普外科
  // 测试3：本季度抽查1200份病历，缺陷300份，合格率75%，评级待改进，重点关注中医科
  const summary = `本季度抽查${input.totalRecords}份病历，缺陷${input.defectCount}份，合格率${passRate}%，评级${grade}，重点关注${input.topDept}`;
  return { passRate, grade, summary };
}

/**
 * 构建季报报告。
 *
 * @param result 季报结果
 * @returns 季报报告（passRate + grade + summary 透传）
 */
export function buildAiQcQuarterlyReportReport(result: AiQcQuarterlyReportResultV14): AiQcQuarterlyReportReportV14 {
  // 手算：透传 passRate + grade + summary
  // 测试4：{passRate=94.0, grade='优秀', summary='本季度抽查1500份病历，缺陷90份，合格率94%，评级优秀，重点关注普外科'} → 透传
  return { passRate: result.passRate, grade: result.grade, summary: result.summary };
}
