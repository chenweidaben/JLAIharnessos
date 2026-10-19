/**
 * 健澜科技 jlmedaios - 病历AI出院随访计划推荐 V14 聚合器（M563-C）
 *
 * 纯函数：构建 AI 出院随访计划推荐基础数据 + AI 出院随访计划推荐 + 构建出院随访计划推荐报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 出院随访计划推荐基础数据 */
export interface AiDischargeFollowupRecoV14 {
  recordId: string;
  dept: string;
}

/** AI 出院随访计划推荐输入 */
export interface AiDischargeFollowupRecoInputV14 {
  diagnosis: string;
  dischargeDay: number;
}

/** AI 出院随访计划推荐结果 */
export interface AiDischargeFollowupRecoResultV14 {
  followupDays: number;
  followupMethod: string;
}

/** 出院随访计划推荐报告 */
export interface AiDischargeFollowupRecoReportV14 {
  followupDays: number;
  followupMethod: string;
}

/**
 * 构建 AI 出院随访计划推荐基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 出院随访计划推荐基础数据
 */
export function buildAiDischargeFollowupReco(recordId: string, dept: string): AiDischargeFollowupRecoV14 {
  return { recordId, dept };
}

/**
 * AI 出院随访计划推荐。
 * followupDays = diagnosis.includes('肿瘤') ? 7
 *   : diagnosis.includes('骨折') ? 30 : 90
 * followupMethod = diagnosis.includes('肿瘤') ? '门诊+电话随访'
 *   : diagnosis.includes('骨折') ? '门诊复查' : '电话随访'
 *
 * @param input 出院随访计划推荐输入（诊断 + 出院天数）
 * @returns 出院随访计划推荐结果（followupDays + followupMethod）
 */
export function recommendDischargeFollowupByAi(input: AiDischargeFollowupRecoInputV14): AiDischargeFollowupRecoResultV14 {
  // 手算：followupDays = diagnosis.includes('肿瘤') ? 7
  //   : diagnosis.includes('骨折') ? 30 : 90
  // 测试2：diagnosis='恶性肿瘤术后' → includes('肿瘤')=true → 7
  // 测试3：diagnosis='上呼吸道感染' → includes('肿瘤')=false, includes('骨折')=false → 90
  const followupDays = input.diagnosis.includes("肿瘤")
    ? 7
    : input.diagnosis.includes("骨折")
      ? 30
      : 90;
  // 手算：followupMethod = diagnosis.includes('肿瘤') ? '门诊+电话随访'
  //   : diagnosis.includes('骨折') ? '门诊复查' : '电话随访'
  // 测试2：diagnosis='恶性肿瘤术后' → includes('肿瘤')=true → '门诊+电话随访'
  // 测试3：diagnosis='上呼吸道感染' → includes('肿瘤')=false, includes('骨折')=false → '电话随访'
  const followupMethod = input.diagnosis.includes("肿瘤")
    ? "门诊+电话随访"
    : input.diagnosis.includes("骨折")
      ? "门诊复查"
      : "电话随访";
  return { followupDays, followupMethod };
}

/**
 * 构建出院随访计划推荐报告。
 *
 * @param result 出院随访计划推荐结果
 * @returns 出院随访计划推荐报告（followupDays + followupMethod 透传）
 */
export function buildAiDischargeFollowupRecoReport(result: AiDischargeFollowupRecoResultV14): AiDischargeFollowupRecoReportV14 {
  // 手算：透传 followupDays + followupMethod
  // 测试4：{followupDays=7, followupMethod='门诊+电话随访'} → 透传
  return { followupDays: result.followupDays, followupMethod: result.followupMethod };
}
