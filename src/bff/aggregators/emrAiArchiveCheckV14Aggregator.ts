/**
 * 健澜科技 jlmedaios - 病历AI归档校验 V14 聚合器（M551-D，M551 收官）
 *
 * 纯函数：构建 AI 归档校验基础数据 + AI 病案归档校验 + 构建归档校验报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 归档校验基础数据 */
export interface AiArchiveCheckV14 {
  recordId: string;
  dept: string;
}

/** AI 归档校验输入 */
export interface AiArchiveCheckInputV14 {
  hasCompleteRecord: boolean;
  hasSigned: boolean;
  hasCoded: boolean;
}

/** AI 归档校验结果 */
export interface AiArchiveCheckResultV14 {
  canArchive: boolean;
  missingItems: number;
}

/** 归档校验报告 */
export interface AiArchiveCheckReportV14 {
  canArchive: boolean;
  missingItems: number;
}

/**
 * 构建 AI 归档校验基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 归档校验基础数据
 */
export function buildAiArchiveCheck(recordId: string, dept: string): AiArchiveCheckV14 {
  return { recordId, dept };
}

/**
 * AI 病案归档校验。
 * missingItems = (!hasCompleteRecord ? 1 : 0) + (!hasSigned ? 1 : 0) + (!hasCoded ? 1 : 0)
 * canArchive = missingItems === 0
 *
 * @param input 归档校验输入（病历完整 + 已签名 + 已编码 是否具备）
 * @returns 归档校验结果（canArchive + missingItems）
 */
export function checkArchiveByAi(input: AiArchiveCheckInputV14): AiArchiveCheckResultV14 {
  // 手算：missingItems = (!hasCompleteRecord ? 1 : 0) + (!hasSigned ? 1 : 0) + (!hasCoded ? 1 : 0)
  // 测试2：hasCompleteRecord=true, hasSigned=true, hasCoded=true → 0+0+0 = 0
  // 测试3：hasCompleteRecord=true, hasSigned=false, hasCoded=false → 0+1+1 = 2
  const missingItems =
    (input.hasCompleteRecord ? 0 : 1) +
    (input.hasSigned ? 0 : 1) +
    (input.hasCoded ? 0 : 1);
  // 手算：canArchive = missingItems === 0
  // 测试2：missingItems=0 → canArchive=true
  // 测试3：missingItems=2 → canArchive=false
  const canArchive = missingItems === 0;
  return { canArchive, missingItems };
}

/**
 * 构建归档校验报告。
 *
 * @param result 归档校验结果
 * @returns 归档校验报告（canArchive + missingItems 透传）
 */
export function buildAiArchiveCheckReport(result: AiArchiveCheckResultV14): AiArchiveCheckReportV14 {
  // 手算：透传 canArchive + missingItems
  // 测试4：{canArchive=true, missingItems=0} → 透传
  return { canArchive: result.canArchive, missingItems: result.missingItems };
}
