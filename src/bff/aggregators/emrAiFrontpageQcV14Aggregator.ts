/**
 * 健澜科技 jlmedaios - 病历AI病案首页质控 V14 聚合器（M544-C）
 *
 * 纯函数：构建 AI 首页质控基础数据 + AI 首页质控 + 构建首页质控报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 首页质控基础数据 */
export interface AiFrontpageQcV14 {
  recordId: string;
  dept: string;
}

/** AI 首页质控输入 */
export interface AiFrontpageQcInputV14 {
  hasMainDx: boolean;
  hasMainOp: boolean;
  hasOutcome: boolean;
}

/** AI 首页质控结果 */
export interface AiFrontpageQcResultV14 {
  issues: number;
  pass: boolean;
}

/** 首页质控报告 */
export interface AiFrontpageQcReportV14 {
  issues: number;
  pass: boolean;
}

/**
 * 构建 AI 首页质控基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 首页质控基础数据
 */
export function buildAiFrontpageQc(recordId: string, dept: string): AiFrontpageQcV14 {
  return { recordId, dept };
}

/**
 * AI 首页质控。
 * issues = (!hasMainDx ? 1 : 0) + (!hasMainOp ? 1 : 0) + (!hasOutcome ? 1 : 0)
 * pass = issues === 0
 *
 * @param input 质控输入（主诊断/主手术/转归）
 * @returns 质控结果（issues + pass）
 */
export function qcFrontpageByAi(input: AiFrontpageQcInputV14): AiFrontpageQcResultV14 {
  // 手算：issues = (!hasMainDx ? 1 : 0) + (!hasMainOp ? 1 : 0) + (!hasOutcome ? 1 : 0)
  // 测试2：hasMainDx=true, hasMainOp=true, hasOutcome=true → 0+0+0=0
  // 测试3：hasMainDx=true, hasMainOp=false, hasOutcome=false → 0+1+1=2
  const issues = (!input.hasMainDx ? 1 : 0) + (!input.hasMainOp ? 1 : 0) + (!input.hasOutcome ? 1 : 0);
  // 手算：pass = issues === 0
  // 测试2：issues=0 → pass=true
  // 测试3：issues=2 → pass=false
  const pass = issues === 0;
  return { issues, pass };
}

/**
 * 构建首页质控报告。
 *
 * @param result 质控结果
 * @returns 质控报告（issues + pass 透传）
 */
export function buildAiFrontpageQcReport(result: AiFrontpageQcResultV14): AiFrontpageQcReportV14 {
  // 手算：透传 issues + pass
  // 测试4：{issues=0, pass=true} → 透传
  return { issues: result.issues, pass: result.pass };
}
