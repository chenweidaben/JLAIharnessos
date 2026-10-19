/**
 * 健澜科技 jlmedaios - 病历AI手术记录质控 V14 聚合器（M555-B）
 *
 * 纯函数：构建 AI 手术记录质控基础数据 + AI 手术记录质控 + 构建手术记录质控报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 手术记录质控基础数据 */
export interface AiOpRecordQcV14 {
  recordId: string;
  dept: string;
}

/** AI 手术记录质控输入 */
export interface AiOpRecordQcInputV14 {
  hasOpName: boolean;
  hasOpDate: boolean;
  hasSurgeon: boolean;
  hasAnesthesia: boolean;
  hasOpFindings: boolean;
}

/** AI 手术记录质控结果 */
export interface AiOpRecordQcResultV14 {
  missingCount: number;
  pass: boolean;
}

/** 手术记录质控报告 */
export interface AiOpRecordQcReportV14 {
  missingCount: number;
  pass: boolean;
}

/**
 * 构建 AI 手术记录质控基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 手术记录质控基础数据
 */
export function buildAiOpRecordQc(recordId: string, dept: string): AiOpRecordQcV14 {
  return { recordId, dept };
}

/**
 * AI 手术记录质控。
 * missingCount = (!hasOpName ? 1 : 0) + (!hasOpDate ? 1 : 0) + (!hasSurgeon ? 1 : 0)
 *   + (!hasAnesthesia ? 1 : 0) + (!hasOpFindings ? 1 : 0)
 * pass = missingCount === 0
 *
 * @param input 手术记录质控输入（5 项布尔）
 * @returns 手术记录质控结果（missingCount + pass）
 */
export function checkOpRecordQcByAi(input: AiOpRecordQcInputV14): AiOpRecordQcResultV14 {
  // 手算：missingCount = (!hasOpName ? 1 : 0) + (!hasOpDate ? 1 : 0) + (!hasSurgeon ? 1 : 0)
  //   + (!hasAnesthesia ? 1 : 0) + (!hasOpFindings ? 1 : 0)
  // 测试2：5 项全有 → missingCount=0
  // 测试3：hasOpName=true, hasOpDate=true, hasSurgeon=true, hasAnesthesia=false, hasOpFindings=false
  //   → missingCount = 0+0+0+1+1 = 2
  const missingCount = (!input.hasOpName ? 1 : 0)
    + (!input.hasOpDate ? 1 : 0)
    + (!input.hasSurgeon ? 1 : 0)
    + (!input.hasAnesthesia ? 1 : 0)
    + (!input.hasOpFindings ? 1 : 0);
  // 手算：pass = missingCount === 0
  // 测试2：missingCount=0 → pass=true
  // 测试3：missingCount=2 → pass=false
  const pass = missingCount === 0;
  return { missingCount, pass };
}

/**
 * 构建手术记录质控报告。
 *
 * @param result 手术记录质控结果
 * @returns 手术记录质控报告（missingCount + pass 透传）
 */
export function buildAiOpRecordQcReport(result: AiOpRecordQcResultV14): AiOpRecordQcReportV14 {
  // 手算：透传 missingCount + pass
  // 测试4：{missingCount=0, pass=true} → 透传
  return { missingCount: result.missingCount, pass: result.pass };
}
