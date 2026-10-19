/**
 * 健澜科技 jlmedaios - 病历AI护理计划推荐 V14 聚合器（M557-B）
 *
 * 纯函数：构建 AI 护理计划推荐基础数据 + AI 护理计划推荐 + 构建护理计划推荐报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 护理计划推荐基础数据 */
export interface AiNursingPlanRecoV14 {
  recordId: string;
  dept: string;
}

/** AI 护理计划推荐输入 */
export interface AiNursingPlanRecoInputV14 {
  diagnosis: string;
  patientAge: number;
}

/** AI 护理计划推荐结果 */
export interface AiNursingPlanRecoResultV14 {
  planName: string;
  frequency: string;
}

/** 护理计划推荐报告 */
export interface AiNursingPlanRecoReportV14 {
  planName: string;
  frequency: string;
}

/**
 * 构建 AI 护理计划推荐基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 护理计划推荐基础数据
 */
export function buildAiNursingPlanReco(recordId: string, dept: string): AiNursingPlanRecoV14 {
  return { recordId, dept };
}

/**
 * AI 护理计划推荐。
 * planName = diagnosis.includes('心梗') ? '心梗术后护理计划'
 *   : diagnosis.includes('肺炎') ? '肺炎呼吸道护理计划' : '常规护理计划'
 * frequency = patientAge >= 70 ? '每日4次' : '每日2次'
 *
 * @param input 护理计划推荐输入（诊断 + 年龄）
 * @returns 护理计划推荐结果（planName + frequency）
 */
export function recommendNursingPlanByAi(input: AiNursingPlanRecoInputV14): AiNursingPlanRecoResultV14 {
  // 手算：planName = diagnosis.includes('心梗') ? '心梗术后护理计划'
  //   : diagnosis.includes('肺炎') ? '肺炎呼吸道护理计划' : '常规护理计划'
  // 测试2：diagnosis='急性心梗' → includes('心梗')=true → planName='心梗术后护理计划'
  // 测试3：diagnosis='上呼吸道感染' → 不含心梗/肺炎 → planName='常规护理计划'
  const planName = input.diagnosis.includes("心梗")
    ? "心梗术后护理计划"
    : input.diagnosis.includes("肺炎")
      ? "肺炎呼吸道护理计划"
      : "常规护理计划";
  // 手算：frequency = patientAge >= 70 ? '每日4次' : '每日2次'
  // 测试2：patientAge=75 >= 70 → frequency='每日4次'
  // 测试3：patientAge=30 < 70 → frequency='每日2次'
  const frequency = input.patientAge >= 70 ? "每日4次" : "每日2次";
  return { planName, frequency };
}

/**
 * 构建护理计划推荐报告。
 *
 * @param result 护理计划推荐结果
 * @returns 护理计划推荐报告（planName + frequency 透传）
 */
export function buildAiNursingPlanRecoReport(result: AiNursingPlanRecoResultV14): AiNursingPlanRecoReportV14 {
  // 手算：透传 planName + frequency
  // 测试4：{planName='心梗术后护理计划', frequency='每日4次'} → 透传
  return { planName: result.planName, frequency: result.frequency };
}
