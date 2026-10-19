/**
 * 健澜科技 jlmedaios - 病历AI门诊复诊提醒推荐 V14 聚合器（M560-D，M560 收官）
 *
 * 纯函数：构建 AI 门诊复诊提醒推荐基础数据 + AI 门诊复诊提醒推荐 + 构建门诊复诊提醒推荐报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 门诊复诊提醒推荐基础数据 */
export interface AiOutpatientFollowupRecoV14 {
  recordId: string;
  dept: string;
}

/** AI 门诊复诊提醒推荐输入 */
export interface AiOutpatientFollowupRecoInputV14 {
  diagnosis: string;
  severity: string;
}

/** AI 门诊复诊提醒推荐结果 */
export interface AiOutpatientFollowupRecoResultV14 {
  followupDays: number;
  reminder: string;
}

/** 门诊复诊提醒推荐报告 */
export interface AiOutpatientFollowupRecoReportV14 {
  followupDays: number;
  reminder: string;
}

/**
 * 构建 AI 门诊复诊提醒推荐基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 门诊复诊提醒推荐基础数据
 */
export function buildAiOutpatientFollowupReco(recordId: string, dept: string): AiOutpatientFollowupRecoV14 {
  return { recordId, dept };
}

/**
 * AI 门诊复诊提醒推荐。
 * followupDays = diagnosis.includes('心梗') ? 7
 *   : diagnosis.includes('肺炎') ? 14 : 30
 * reminder = severity === '危重' ? '建议3天内复诊，如有不适随时就诊' : '建议按预约时间复诊'
 *
 * @param input 复诊提醒推荐输入（诊断 + 病情严重度）
 * @returns 复诊提醒推荐结果（followupDays + reminder）
 */
export function recommendFollowupByAi(input: AiOutpatientFollowupRecoInputV14): AiOutpatientFollowupRecoResultV14 {
  // 手算：followupDays = diagnosis.includes('心梗') ? 7
  //   : diagnosis.includes('肺炎') ? 14 : 30
  // 测试2：diagnosis='急性心梗' → includes('心梗')=true → 7
  // 测试3：diagnosis='上呼吸道感染' → includes('心梗')=false, includes('肺炎')=false → 30
  const followupDays = input.diagnosis.includes("心梗")
    ? 7
    : input.diagnosis.includes("肺炎")
      ? 14
      : 30;
  // 手算：reminder = severity === '危重' ? '建议3天内复诊，如有不适随时就诊' : '建议按预约时间复诊'
  // 测试2：severity='危重' → '建议3天内复诊，如有不适随时就诊'
  // 测试3：severity='普通' → '建议按预约时间复诊'
  const reminder = input.severity === "危重"
    ? "建议3天内复诊，如有不适随时就诊"
    : "建议按预约时间复诊";
  return { followupDays, reminder };
}

/**
 * 构建门诊复诊提醒推荐报告。
 *
 * @param result 复诊提醒推荐结果
 * @returns 复诊提醒推荐报告（followupDays + reminder 透传）
 */
export function buildAiOutpatientFollowupRecoReport(result: AiOutpatientFollowupRecoResultV14): AiOutpatientFollowupRecoReportV14 {
  // 手算：透传 followupDays + reminder
  // 测试4：{followupDays=7, reminder='建议3天内复诊，如有不适随时就诊'} → 透传
  return { followupDays: result.followupDays, reminder: result.reminder };
}
