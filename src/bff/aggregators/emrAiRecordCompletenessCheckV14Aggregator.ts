/**
 * 健澜科技 jlmedaios - 病历AI病历完整性检查 V14 聚合器（M553-B）
 *
 * 纯函数：构建 AI 病历完整性检查基础数据 + AI 病历完整性检查 + 构建完整性检查报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 病历完整性检查基础数据 */
export interface AiRecordCompletenessCheckV14 {
  recordId: string;
  dept: string;
}

/** AI 病历完整性检查输入 */
export interface AiRecordCompletenessCheckInputV14 {
  hasChiefComplaint: boolean;
  hasPresentIllness: boolean;
  hasPastHistory: boolean;
  hasPhysicalExam: boolean;
}

/** AI 病历完整性检查结果 */
export interface AiRecordCompletenessCheckResultV14 {
  missingItems: number;
  completenessRate: number;
}

/** 完整性检查报告 */
export interface AiRecordCompletenessCheckReportV14 {
  missingItems: number;
  completenessRate: number;
}

/**
 * 构建 AI 病历完整性检查基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 病历完整性检查基础数据
 */
export function buildAiRecordCompletenessCheck(recordId: string, dept: string): AiRecordCompletenessCheckV14 {
  return { recordId, dept };
}

/**
 * AI 病历完整性检查。
 * missingItems = (!hasChiefComplaint ? 1 : 0) + (!hasPresentIllness ? 1 : 0) + (!hasPastHistory ? 1 : 0) + (!hasPhysicalExam ? 1 : 0)
 * completenessRate = Math.round((4 - missingItems) / 4 * 1000) / 10
 *
 * @param input 完整性检查输入（主诉 + 现病史 + 既往史 + 体格检查 是否具备）
 * @returns 完整性检查结果（missingItems + completenessRate）
 */
export function checkRecordCompletenessByAi(input: AiRecordCompletenessCheckInputV14): AiRecordCompletenessCheckResultV14 {
  // 手算：missingItems = (!hasChiefComplaint ? 1 : 0) + (!hasPresentIllness ? 1 : 0) + (!hasPastHistory ? 1 : 0) + (!hasPhysicalExam ? 1 : 0)
  // 测试2：hasChiefComplaint=true, hasPresentIllness=true, hasPastHistory=true, hasPhysicalExam=true → 0+0+0+0 = 0
  // 测试3：hasChiefComplaint=true, hasPresentIllness=true, hasPastHistory=false, hasPhysicalExam=false → 0+0+1+1 = 2
  const missingItems =
    (input.hasChiefComplaint ? 0 : 1) +
    (input.hasPresentIllness ? 0 : 1) +
    (input.hasPastHistory ? 0 : 1) +
    (input.hasPhysicalExam ? 0 : 1);
  // 手算：completenessRate = Math.round((4 - missingItems) / 4 * 1000) / 10
  // 测试2：missingItems=0 → Math.round(4/4*1000)/10 = Math.round(1000)/10 = 1000/10 = 100.0
  // 测试3：missingItems=2 → Math.round(2/4*1000)/10 = Math.round(500)/10 = 500/10 = 50.0
  const completenessRate = Math.round(((4 - missingItems) / 4) * 1000) / 10;
  return { missingItems, completenessRate };
}

/**
 * 构建完整性检查报告。
 *
 * @param result 完整性检查结果
 * @returns 完整性检查报告（missingItems + completenessRate 透传）
 */
export function buildAiRecordCompletenessCheckReport(result: AiRecordCompletenessCheckResultV14): AiRecordCompletenessCheckReportV14 {
  // 手算：透传 missingItems + completenessRate
  // 测试4：{missingItems=0, completenessRate=100.0} → 透传
  return { missingItems: result.missingItems, completenessRate: result.completenessRate };
}
