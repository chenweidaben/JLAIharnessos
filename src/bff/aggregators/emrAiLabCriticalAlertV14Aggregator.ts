/**
 * 健澜科技 jlmedaios - 病历AI检验危急值智能提醒 V14 聚合器（M561-D，M561 收官）
 *
 * 纯函数：构建 AI 检验危急值智能提醒基础数据 + AI 检验危急值智能提醒 + 构建检验危急值智能提醒报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 检验危急值智能提醒基础数据 */
export interface AiLabCriticalAlertV14 {
  recordId: string;
  dept: string;
}

/** AI 检验危急值智能提醒输入 */
export interface AiLabCriticalAlertInputV14 {
  testName: string;
  value: number;
  lowLimit: number;
  highLimit: number;
}

/** AI 检验危急值智能提醒结果 */
export interface AiLabCriticalAlertResultV14 {
  isCritical: boolean;
  alertLevel: string;
  advice: string;
}

/** 检验危急值智能提醒报告 */
export interface AiLabCriticalAlertReportV14 {
  isCritical: boolean;
  alertLevel: string;
  advice: string;
}

/**
 * 构建 AI 检验危急值智能提醒基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 检验危急值智能提醒基础数据
 */
export function buildAiLabCriticalAlert(recordId: string, dept: string): AiLabCriticalAlertV14 {
  return { recordId, dept };
}

/**
 * AI 检验危急值智能提醒。
 * isCritical = value < lowLimit || value > highLimit
 * alertLevel = isCritical ? (value < lowLimit ? '偏低危急' : '偏高危急') : '正常'
 * advice = isCritical ? '立即通知临床医生，建议复查' : '无需特殊处理'
 *
 * @param input 危急值智能提醒输入（检验项目 + 检验值 + 低限 + 高限）
 * @returns 危急值智能提醒结果（isCritical + alertLevel + advice）
 */
export function alertLabCriticalByAi(input: AiLabCriticalAlertInputV14): AiLabCriticalAlertResultV14 {
  // 手算：isCritical = value < lowLimit || value > highLimit
  // 测试2：value=6.5, lowLimit=3.5, highLimit=5.5
  //   = 6.5<3.5=false || 6.5>5.5=true → true
  // 测试3：value=6.0, lowLimit=4.0, highLimit=10.0
  //   = 6.0<4.0=false || 6.0>10.0=false → false
  const isCritical = input.value < input.lowLimit || input.value > input.highLimit;
  // 手算：alertLevel = isCritical ? (value < lowLimit ? '偏低危急' : '偏高危急') : '正常'
  // 测试2：isCritical=true, 6.5<3.5=false → '偏高危急'
  // 测试3：isCritical=false → '正常'
  const alertLevel = isCritical
    ? (input.value < input.lowLimit ? "偏低危急" : "偏高危急")
    : "正常";
  // 手算：advice = isCritical ? '立即通知临床医生，建议复查' : '无需特殊处理'
  // 测试2：isCritical=true → '立即通知临床医生，建议复查'
  // 测试3：isCritical=false → '无需特殊处理'
  const advice = isCritical
    ? "立即通知临床医生，建议复查"
    : "无需特殊处理";
  return { isCritical, alertLevel, advice };
}

/**
 * 构建检验危急值智能提醒报告。
 *
 * @param result 危急值智能提醒结果
 * @returns 危急值智能提醒报告（isCritical + alertLevel + advice 透传）
 */
export function buildAiLabCriticalAlertReport(result: AiLabCriticalAlertResultV14): AiLabCriticalAlertReportV14 {
  // 手算：透传 isCritical + alertLevel + advice
  // 测试4：{isCritical=true, alertLevel='偏高危急', advice='立即通知临床医生，建议复查'} → 透传
  return { isCritical: result.isCritical, alertLevel: result.alertLevel, advice: result.advice };
}
