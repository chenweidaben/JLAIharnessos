/**
 * 健澜科技 jlmedaios - 病历AI用药错误预警 V14 聚合器（M559-B）
 *
 * 纯函数：构建 AI 用药错误预警基础数据 + AI 用药错误预警 + 构建用药错误预警报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 用药错误预警基础数据 */
export interface AiMedicationErrorAlertV14 {
  recordId: string;
  dept: string;
}

/** AI 用药错误预警输入 */
export interface AiMedicationErrorAlertInputV14 {
  drugName: string;
  patientAge: number;
  hasAllergy: boolean;
}

/** AI 用药错误预警结果 */
export interface AiMedicationErrorAlertResultV14 {
  isError: boolean;
  alertLevel: string;
}

/** 用药错误预警报告 */
export interface AiMedicationErrorAlertReportV14 {
  isError: boolean;
  alertLevel: string;
}

/**
 * 构建 AI 用药错误预警基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 用药错误预警基础数据
 */
export function buildAiMedicationErrorAlert(recordId: string, dept: string): AiMedicationErrorAlertV14 {
  return { recordId, dept };
}

/**
 * AI 用药错误预警。
 * isError = hasAllergy || (patientAge >= 75 && drugName.includes('抗生素'))
 * alertLevel = hasAllergy ? '红色预警'
 *   : (patientAge >= 75 && drugName.includes('抗生素')) ? '黄色预警' : '无预警'
 *
 * @param input 用药错误预警输入（药品名称 + 年龄 + 是否过敏）
 * @returns 用药错误预警结果（isError + alertLevel）
 */
export function alertMedicationErrorByAi(input: AiMedicationErrorAlertInputV14): AiMedicationErrorAlertResultV14 {
  // 手算：isError = hasAllergy || (patientAge >= 75 && drugName.includes('抗生素'))
  // 测试2：drugName='布洛芬', patientAge=45, hasAllergy=false
  //   = false || (45>=75 && ...) = false || false = false
  // 测试3：drugName='青霉素', patientAge=50, hasAllergy=true
  //   = true || ... = true
  const isError = input.hasAllergy
    || (input.patientAge >= 75 && input.drugName.includes("抗生素"));
  // 手算：alertLevel = hasAllergy ? '红色预警'
  //   : (patientAge >= 75 && drugName.includes('抗生素')) ? '黄色预警' : '无预警'
  // 测试2：hasAllergy=false, 45>=75=false → '无预警'
  // 测试3：hasAllergy=true → '红色预警'
  const alertLevel = input.hasAllergy
    ? "红色预警"
    : (input.patientAge >= 75 && input.drugName.includes("抗生素"))
      ? "黄色预警"
      : "无预警";
  return { isError, alertLevel };
}

/**
 * 构建用药错误预警报告。
 *
 * @param result 用药错误预警结果
 * @returns 用药错误预警报告（isError + alertLevel 透传）
 */
export function buildAiMedicationErrorAlertReport(result: AiMedicationErrorAlertResultV14): AiMedicationErrorAlertReportV14 {
  // 手算：透传 isError + alertLevel
  // 测试4：{isError=false, alertLevel='无预警'} → 透传
  return { isError: result.isError, alertLevel: result.alertLevel };
}
