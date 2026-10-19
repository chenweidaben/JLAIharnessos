/**
 * 健澜科技 jlmedaios - 病历AI合理用药审查 V14 聚合器（M554-B）
 *
 * 纯函数：构建 AI 合理用药审查基础数据 + AI 合理用药审查 + 构建合理用药审查报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 合理用药审查基础数据 */
export interface AiRationalMedicationAuditV14 {
  recordId: string;
  dept: string;
}

/** AI 合理用药审查输入 */
export interface AiRationalMedicationAuditInputV14 {
  drugName: string;
  patientAge: number;
  hasAllergy: boolean;
}

/** AI 合理用药审查结果 */
export interface AiRationalMedicationAuditResultV14 {
  isRational: boolean;
  advice: string;
}

/** 合理用药审查报告 */
export interface AiRationalMedicationAuditReportV14 {
  isRational: boolean;
  advice: string;
}

/**
 * 构建 AI 合理用药审查基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 合理用药审查基础数据
 */
export function buildAiRationalMedicationAudit(recordId: string, dept: string): AiRationalMedicationAuditV14 {
  return { recordId, dept };
}

/**
 * AI 合理用药审查。
 * isRational = !(hasAllergy || (patientAge >= 75 && drugName.includes('抗生素')))
 * advice = hasAllergy ? '建议更换药物' : (patientAge >= 75 && drugName.includes('抗生素')) ? '建议减量使用' : '用药合理'
 *
 * @param input 合理用药审查输入（药品名称 + 患者年龄 + 是否过敏）
 * @returns 合理用药审查结果（isRational + advice）
 */
export function auditRationalMedicationByAi(input: AiRationalMedicationAuditInputV14): AiRationalMedicationAuditResultV14 {
  // 手算：isRational = !(hasAllergy || (patientAge >= 75 && drugName.includes('抗生素')))
  // 测试2：drugName='布洛芬', patientAge=45, hasAllergy=false
  //   !(false || (45>=75 && '布洛芬'.includes('抗生素'))) = !(false || (false && false)) = !false = true
  // 测试3：drugName='青霉素', patientAge=50, hasAllergy=true
  //   !(true || ...) = !true = false
  const isRational = !(input.hasAllergy || (input.patientAge >= 75 && input.drugName.includes("抗生素")));
  // 手算：advice = hasAllergy ? '建议更换药物' : (patientAge >= 75 && drugName.includes('抗生素')) ? '建议减量使用' : '用药合理'
  // 测试2：hasAllergy=false, 45<75 → advice='用药合理'
  // 测试3：hasAllergy=true → advice='建议更换药物'
  const advice = input.hasAllergy
    ? "建议更换药物"
    : input.patientAge >= 75 && input.drugName.includes("抗生素")
      ? "建议减量使用"
      : "用药合理";
  return { isRational, advice };
}

/**
 * 构建合理用药审查报告。
 *
 * @param result 合理用药审查结果
 * @returns 合理用药审查报告（isRational + advice 透传）
 */
export function buildAiRationalMedicationAuditReport(result: AiRationalMedicationAuditResultV14): AiRationalMedicationAuditReportV14 {
  // 手算：透传 isRational + advice
  // 测试4：{isRational=true, advice='用药合理'} → 透传
  return { isRational: result.isRational, advice: result.advice };
}
