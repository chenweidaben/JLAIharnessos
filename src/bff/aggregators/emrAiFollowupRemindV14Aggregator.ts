/**
 * 健澜科技 jlmedaios - 病历AI复诊提醒 V14 聚合器（M547-D，M547 收官）
 *
 * 纯函数：构建 AI 复诊提醒基础数据 + AI 复诊提醒 + 构建复诊提醒报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 复诊提醒基础数据 */
export interface AiFollowupRemindV14 {
  recordId: string;
  dept: string;
}

/** AI 复诊提醒输入 */
export interface AiFollowupRemindInputV14 {
  diagnosis: string;
  daysSinceDischarge: number;
}

/** AI 复诊提醒结果 */
export interface AiFollowupRemindResultV14 {
  remindDate: string;
  action: string;
}

/** 复诊提醒报告 */
export interface AiFollowupRemindReportV14 {
  remindDate: string;
  action: string;
}

/**
 * 构建 AI 复诊提醒基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 复诊提醒基础数据
 */
export function buildAiFollowupRemind(recordId: string, dept: string): AiFollowupRemindV14 {
  return { recordId, dept };
}

/**
 * AI 复诊提醒。
 * action = diagnosis.includes('心梗') ? '建议立即复诊' : '建议按计划复诊'
 * remindDate = `出院后第${daysSinceDischarge + 7}天`
 *
 * @param input 复诊提醒输入（诊断 + 出院后天数）
 * @returns 复诊提醒结果（remindDate + action）
 */
export function remindFollowupByAi(input: AiFollowupRemindInputV14): AiFollowupRemindResultV14 {
  // 手算：action = diagnosis.includes('心梗') ? '建议立即复诊' : '建议按计划复诊'
  // 测试2：diagnosis='急性心梗' → 含'心梗' → action='建议立即复诊'
  // 测试3：diagnosis='上感' → 不含'心梗' → action='建议按计划复诊'
  const action = input.diagnosis.includes("心梗") ? "建议立即复诊" : "建议按计划复诊";
  // 手算：remindDate = `出院后第${daysSinceDischarge + 7}天`
  // 测试2：daysSinceDischarge=3 → 3+7=10 → remindDate='出院后第10天'
  // 测试3：daysSinceDischarge=5 → 5+7=12 → remindDate='出院后第12天'
  const remindDate = `出院后第${input.daysSinceDischarge + 7}天`;
  return { remindDate, action };
}

/**
 * 构建复诊提醒报告。
 *
 * @param result 复诊提醒结果
 * @returns 复诊提醒报告（remindDate + action 透传）
 */
export function buildAiFollowupRemindReport(result: AiFollowupRemindResultV14): AiFollowupRemindReportV14 {
  // 手算：透传 remindDate + action
  // 测试4：{remindDate='出院后第10天', action='建议立即复诊'} → 透传
  return { remindDate: result.remindDate, action: result.action };
}
