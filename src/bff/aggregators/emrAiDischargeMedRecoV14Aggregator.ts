/**
 * 健澜科技 jlmedaios - 病历AI出院带药建议 V14 聚合器（M558-D，M558 收官）
 *
 * 纯函数：构建 AI 出院带药建议基础数据 + AI 出院带药建议 + 构建出院带药建议报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 出院带药建议基础数据 */
export interface AiDischargeMedRecoV14 {
  recordId: string;
  dept: string;
}

/** AI 出院带药建议输入 */
export interface AiDischargeMedRecoInputV14 {
  diagnosis: string;
  patientAge: number;
}

/** AI 出院带药建议结果 */
export interface AiDischargeMedRecoResultV14 {
  medName: string;
  dosage: string;
  days: number;
}

/** 出院带药建议报告 */
export interface AiDischargeMedRecoReportV14 {
  medName: string;
  dosage: string;
  days: number;
}

/**
 * 构建 AI 出院带药建议基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 出院带药建议基础数据
 */
export function buildAiDischargeMedReco(recordId: string, dept: string): AiDischargeMedRecoV14 {
  return { recordId, dept };
}

/**
 * AI 出院带药建议。
 * medName = diagnosis.includes('心梗') ? '阿司匹林肠溶片'
 *   : diagnosis.includes('肺炎') ? '头孢克洛缓释片' : '布洛芬缓释胶囊'
 * dosage = patientAge >= 75 ? '减半剂量' : '常规剂量'
 * days = diagnosis.includes('心梗') ? 30 : 7
 *
 * @param input 带药建议输入（诊断 + 年龄）
 * @returns 带药建议结果（medName + dosage + days）
 */
export function recommendDischargeMedByAi(input: AiDischargeMedRecoInputV14): AiDischargeMedRecoResultV14 {
  // 手算：medName = diagnosis.includes('心梗') ? '阿司匹林肠溶片'
  //   : diagnosis.includes('肺炎') ? '头孢克洛缓释片' : '布洛芬缓释胶囊'
  // 测试2：diagnosis='急性心梗' → includes('心梗')=true → medName='阿司匹林肠溶片'
  // 测试3：diagnosis='上呼吸道感染' → 不含心梗/肺炎 → medName='布洛芬缓释胶囊'
  const medName = input.diagnosis.includes("心梗")
    ? "阿司匹林肠溶片"
    : input.diagnosis.includes("肺炎")
      ? "头孢克洛缓释片"
      : "布洛芬缓释胶囊";
  // 手算：dosage = patientAge >= 75 ? '减半剂量' : '常规剂量'
  // 测试2：patientAge=78 >= 75 → dosage='减半剂量'
  // 测试3：patientAge=30 < 75 → dosage='常规剂量'
  const dosage = input.patientAge >= 75 ? "减半剂量" : "常规剂量";
  // 手算：days = diagnosis.includes('心梗') ? 30 : 7
  // 测试2：diagnosis='急性心梗' → days=30
  // 测试3：diagnosis='上呼吸道感染' → days=7
  const days = input.diagnosis.includes("心梗") ? 30 : 7;
  return { medName, dosage, days };
}

/**
 * 构建出院带药建议报告。
 *
 * @param result 带药建议结果
 * @returns 带药建议报告（medName + dosage + days 透传）
 */
export function buildAiDischargeMedRecoReport(result: AiDischargeMedRecoResultV14): AiDischargeMedRecoReportV14 {
  // 手算：透传 medName + dosage + days
  // 测试4：{medName='阿司匹林肠溶片', dosage='减半剂量', days=30} → 透传
  return { medName: result.medName, dosage: result.dosage, days: result.days };
}
