/**
 * 健澜科技 jlmedaios - 病历AI质控年报生成 V14 聚合器（M548-D，M548 收官）
 *
 * 纯函数：构建 AI 质控年报基础数据 + AI 质控年报生成 + 构建年报报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 质控年报基础数据 */
export interface AiQcAnnualReportV14 {
  recordId: string;
  dept: string;
}

/** AI 质控年报生成输入 */
export interface AiQcAnnualReportInputV14 {
  totalRecords: number;
  defectCount: number;
  bestDept: string;
  worstDept: string;
}

/** AI 质控年报生成结果 */
export interface AiQcAnnualReportResultV14 {
  passRate: number;
  rank: string;
  summary: string;
}

/** 年报报告 */
export interface AiQcAnnualReportReportV14 {
  passRate: number;
  rank: string;
  summary: string;
}

/**
 * 构建 AI 质控年报基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 质控年报基础数据
 */
export function buildAiQcAnnualReport(recordId: string, dept: string): AiQcAnnualReportV14 {
  return { recordId, dept };
}

/**
 * AI 质控年报生成。
 * passRate = Math.round((totalRecords - defectCount) / totalRecords * 1000) / 10
 * rank = passRate >= 95 ? '优秀' : passRate >= 85 ? '良好' : '一般'
 * summary = `本年度抽查${totalRecords}份病历，缺陷${defectCount}份，合格率${passRate}%，评级${rank}，最佳科室${bestDept}，重点整改${worstDept}`
 *
 * @param input 年报输入（抽查总数 + 缺陷数 + 最佳科室 + 重点整改科室）
 * @returns 年报结果（passRate + rank + summary）
 */
export function generateQcAnnualReportByAi(input: AiQcAnnualReportInputV14): AiQcAnnualReportResultV14 {
  // 手算：passRate = Math.round((totalRecords - defectCount) / totalRecords * 1000) / 10
  // 测试2：totalRecords=6000, defectCount=240 → (6000-240)/6000*1000 = 5760/6000*1000 = 960 → Math.round(960)=960 → 960/10 = 96.0
  // 测试3：totalRecords=5000, defectCount=900 → (5000-900)/5000*1000 = 4100/5000*1000 = 820 → Math.round(820)=820 → 820/10 = 82.0
  const passRate = Math.round(((input.totalRecords - input.defectCount) / input.totalRecords) * 1000) / 10;
  // 手算：rank = passRate >= 95 ? '优秀' : passRate >= 85 ? '良好' : '一般'
  // 测试2：passRate=96.0 → 96>=95 → rank='优秀'
  // 测试3：passRate=82.0 → 82<85 → rank='一般'
  const rank = passRate >= 95 ? "优秀" : passRate >= 85 ? "良好" : "一般";
  // 手算：summary = `本年度抽查${totalRecords}份病历，缺陷${defectCount}份，合格率${passRate}%，评级${rank}，最佳科室${bestDept}，重点整改${worstDept}`
  // 测试2：本年度抽查6000份病历，缺陷240份，合格率96%，评级优秀，最佳科室心内科，重点整改中医科
  // 测试3：本年度抽查5000份病历，缺陷900份，合格率82%，评级一般，最佳科室普外科，重点整改急诊科
  const summary = `本年度抽查${input.totalRecords}份病历，缺陷${input.defectCount}份，合格率${passRate}%，评级${rank}，最佳科室${input.bestDept}，重点整改${input.worstDept}`;
  return { passRate, rank, summary };
}

/**
 * 构建年报报告。
 *
 * @param result 年报结果
 * @returns 年报报告（passRate + rank + summary 透传）
 */
export function buildAiQcAnnualReportReport(result: AiQcAnnualReportResultV14): AiQcAnnualReportReportV14 {
  // 手算：透传 passRate + rank + summary
  // 测试4：{passRate=96.0, rank='优秀', summary='本年度抽查6000份病历，缺陷240份，合格率96%，评级优秀，最佳科室心内科，重点整改中医科'} → 透传
  return { passRate: result.passRate, rank: result.rank, summary: result.summary };
}
