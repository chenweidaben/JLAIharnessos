/**
 * 健澜科技 jlmedaios - 病历AI医保结算清单质控 V14 聚合器（M552-D，M552 收官）
 *
 * 纯函数：构建 AI 医保结算清单质控基础数据 + AI 医保结算清单质控 + 构建结算清单质控报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 医保结算清单质控基础数据 */
export interface AiSettlementListQcV14 {
  recordId: string;
  dept: string;
}

/** AI 医保结算清单质控输入 */
export interface AiSettlementListQcInputV14 {
  hasMainDiag: boolean;
  hasMainSurg: boolean;
  hasCostDetail: boolean;
  hasInsuranceType: boolean;
}

/** AI 医保结算清单质控结果 */
export interface AiSettlementListQcResultV14 {
  missingCount: number;
  pass: boolean;
}

/** 结算清单质控报告 */
export interface AiSettlementListQcReportV14 {
  missingCount: number;
  pass: boolean;
}

/**
 * 构建 AI 医保结算清单质控基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 医保结算清单质控基础数据
 */
export function buildAiSettlementListQc(recordId: string, dept: string): AiSettlementListQcV14 {
  return { recordId, dept };
}

/**
 * AI 医保结算清单质控。
 * missingCount = (!hasMainDiag ? 1 : 0) + (!hasMainSurg ? 1 : 0) + (!hasCostDetail ? 1 : 0) + (!hasInsuranceType ? 1 : 0)
 * pass = missingCount === 0
 *
 * @param input 结算清单质控输入（主诊断 + 主手术 + 费用明细 + 医保类型 是否具备）
 * @returns 结算清单质控结果（missingCount + pass）
 */
export function checkSettlementListQcByAi(input: AiSettlementListQcInputV14): AiSettlementListQcResultV14 {
  // 手算：missingCount = (!hasMainDiag ? 1 : 0) + (!hasMainSurg ? 1 : 0) + (!hasCostDetail ? 1 : 0) + (!hasInsuranceType ? 1 : 0)
  // 测试2：hasMainDiag=true, hasMainSurg=true, hasCostDetail=true, hasInsuranceType=true → 0+0+0+0 = 0
  // 测试3：hasMainDiag=true, hasMainSurg=false, hasCostDetail=true, hasInsuranceType=false → 0+1+0+1 = 2
  const missingCount =
    (input.hasMainDiag ? 0 : 1) +
    (input.hasMainSurg ? 0 : 1) +
    (input.hasCostDetail ? 0 : 1) +
    (input.hasInsuranceType ? 0 : 1);
  // 手算：pass = missingCount === 0
  // 测试2：missingCount=0 → pass=true
  // 测试3：missingCount=2 → pass=false
  const pass = missingCount === 0;
  return { missingCount, pass };
}

/**
 * 构建结算清单质控报告。
 *
 * @param result 结算清单质控结果
 * @returns 结算清单质控报告（missingCount + pass 透传）
 */
export function buildAiSettlementListQcReport(result: AiSettlementListQcResultV14): AiSettlementListQcReportV14 {
  // 手算：透传 missingCount + pass
  // 测试4：{missingCount=0, pass=true} → 透传
  return { missingCount: result.missingCount, pass: result.pass };
}
