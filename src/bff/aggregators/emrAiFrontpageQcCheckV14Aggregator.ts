/**
 * 健澜科技 jlmedaios - 病历AI首页质控检查 V14 聚合器（M551-A）
 *
 * 纯函数：构建 AI 首页质控检查基础数据 + AI 首页质控检查 + 构建首页质控报告。
 * 避让说明：M544-C 已有 emrAiFrontpageQcV14，本切片用 -check 后缀避让。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 首页质控检查基础数据 */
export interface AiFrontpageQcCheckV14 {
  recordId: string;
  dept: string;
}

/** AI 首页质控检查输入 */
export interface AiFrontpageQcCheckInputV14 {
  hasMainDx: boolean;
  hasMainOp: boolean;
  hasOutcome: boolean;
  hasCost: boolean;
}

/** AI 首页质控检查结果 */
export interface AiFrontpageQcCheckResultV14 {
  missingCount: number;
  pass: boolean;
}

/** 首页质控报告 */
export interface AiFrontpageQcCheckReportV14 {
  missingCount: number;
  pass: boolean;
}

/**
 * 构建 AI 首页质控检查基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 首页质控检查基础数据
 */
export function buildAiFrontpageQcCheck(recordId: string, dept: string): AiFrontpageQcCheckV14 {
  return { recordId, dept };
}

/**
 * AI 首页质控检查。
 * missingCount = (!hasMainDx ? 1 : 0) + (!hasMainOp ? 1 : 0) + (!hasOutcome ? 1 : 0) + (!hasCost ? 1 : 0)
 * pass = missingCount === 0
 *
 * @param input 首页质控检查输入（主诊断 + 主手术 + 转归 + 费用 是否具备）
 * @returns 首页质控检查结果（missingCount + pass）
 */
export function checkFrontpageQcByAi(input: AiFrontpageQcCheckInputV14): AiFrontpageQcCheckResultV14 {
  // 手算：missingCount = (!hasMainDx ? 1 : 0) + (!hasMainOp ? 1 : 0) + (!hasOutcome ? 1 : 0) + (!hasCost ? 1 : 0)
  // 测试2：hasMainDx=true, hasMainOp=true, hasOutcome=true, hasCost=true → 0+0+0+0 = 0
  // 测试3：hasMainDx=true, hasMainOp=false, hasOutcome=true, hasCost=false → 0+1+0+1 = 2
  const missingCount =
    (input.hasMainDx ? 0 : 1) +
    (input.hasMainOp ? 0 : 1) +
    (input.hasOutcome ? 0 : 1) +
    (input.hasCost ? 0 : 1);
  // 手算：pass = missingCount === 0
  // 测试2：missingCount=0 → pass=true
  // 测试3：missingCount=2 → pass=false
  const pass = missingCount === 0;
  return { missingCount, pass };
}

/**
 * 构建首页质控报告。
 *
 * @param result 首页质控检查结果
 * @returns 首页质控报告（missingCount + pass 透传）
 */
export function buildAiFrontpageQcCheckReport(result: AiFrontpageQcCheckResultV14): AiFrontpageQcCheckReportV14 {
  // 手算：透传 missingCount + pass
  // 测试4：{missingCount=0, pass=true} → 透传
  return { missingCount: result.missingCount, pass: result.pass };
}
