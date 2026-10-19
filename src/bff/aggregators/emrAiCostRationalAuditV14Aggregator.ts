/**
 * 健澜科技 jlmedaios - 病历AI费用合理性审查 V14 聚合器（M552-C）
 *
 * 纯函数：构建 AI 费用合理性审查基础数据 + AI 费用合理性审查 + 构建费用审查报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 费用合理性审查基础数据 */
export interface AiCostRationalAuditV14 {
  recordId: string;
  dept: string;
}

/** AI 费用合理性审查输入 */
export interface AiCostRationalAuditInputV14 {
  actualCost: number;
  expectedCost: number;
}

/** AI 费用合理性审查结果 */
export interface AiCostRationalAuditResultV14 {
  isReasonable: boolean;
  deviationPct: number;
}

/** 费用审查报告 */
export interface AiCostRationalAuditReportV14 {
  isReasonable: boolean;
  deviationPct: number;
}

/**
 * 构建 AI 费用合理性审查基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 费用合理性审查基础数据
 */
export function buildAiCostRationalAudit(recordId: string, dept: string): AiCostRationalAuditV14 {
  return { recordId, dept };
}

/**
 * AI 费用合理性审查。
 * deviationPct = Math.round((actualCost - expectedCost) / expectedCost * 1000) / 10
 * isReasonable = Math.abs(deviationPct) <= 20
 *
 * @param input 费用审查输入（实际费用 + 预期费用）
 * @returns 费用审查结果（isReasonable + deviationPct）
 */
export function auditCostRationalByAi(input: AiCostRationalAuditInputV14): AiCostRationalAuditResultV14 {
  // 手算：deviationPct = Math.round((actualCost - expectedCost) / expectedCost * 1000) / 10
  // 测试2：actualCost=10500, expectedCost=10000
  //   (10500-10000)/10000*1000 = 500/10000*1000 = 0.05*1000 = 50 → Math.round(50)/10 = 5.0
  // 测试3：actualCost=15000, expectedCost=10000
  //   (15000-10000)/10000*1000 = 5000/10000*1000 = 0.5*1000 = 500 → Math.round(500)/10 = 50.0
  const deviationPct = Math.round(((input.actualCost - input.expectedCost) / input.expectedCost) * 1000) / 10;
  // 手算：isReasonable = Math.abs(deviationPct) <= 20
  // 测试2：|5.0| <= 20 → isReasonable=true
  // 测试3：|50.0| > 20 → isReasonable=false
  const isReasonable = Math.abs(deviationPct) <= 20;
  return { isReasonable, deviationPct };
}

/**
 * 构建费用审查报告。
 *
 * @param result 费用审查结果
 * @returns 费用审查报告（isReasonable + deviationPct 透传）
 */
export function buildAiCostRationalAuditReport(result: AiCostRationalAuditResultV14): AiCostRationalAuditReportV14 {
  // 手算：透传 isReasonable + deviationPct
  // 测试4：{isReasonable=true, deviationPct=5.0} → 透传
  return { isReasonable: result.isReasonable, deviationPct: result.deviationPct };
}
