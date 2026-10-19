/**
 * 健澜科技 jlmedaios - 病历AI处方合理用药审查 V14 聚合器（M558-B）
 *
 * 纯函数：构建 AI 处方合理用药审查基础数据 + AI 处方合理用药审查 + 构建处方合理用药审查报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 处方合理用药审查基础数据 */
export interface AiPrescriptionRationalAuditV14 {
  recordId: string;
  dept: string;
}

/** AI 处方合理用药审查输入 */
export interface AiPrescriptionRationalAuditInputV14 {
  drugName: string;
  patientAge: number;
  hasAllergy: boolean;
}

/** AI 处方合理用药审查结果 */
export interface AiPrescriptionRationalAuditResultV14 {
  isRational: boolean;
  advice: string;
}

/** 处方合理用药审查报告 */
export interface AiPrescriptionRationalAuditReportV14 {
  isRational: boolean;
  advice: string;
}

/**
 * 构建 AI 处方合理用药审查基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 处方合理用药审查基础数据
 */
export function buildAiPrescriptionRationalAudit(recordId: string, dept: string): AiPrescriptionRationalAuditV14 {
  return { recordId, dept };
}

/**
 * AI 处方合理用药审查。
 * isRational = !(hasAllergy || (patientAge >= 75 && drugName.includes('抗生素')))
 * advice = hasAllergy ? '处方过敏风险，建议换药'
 *   : (patientAge >= 75 && drugName.includes('抗生素')) ? '老年患者慎用抗生素，建议减量'
 *   : '处方合理'
 *
 * @param input 处方审查输入（药品名称 + 年龄 + 是否过敏）
 * @returns 处方审查结果（isRational + advice）
 */
export function auditPrescriptionByAi(input: AiPrescriptionRationalAuditInputV14): AiPrescriptionRationalAuditResultV14 {
  // 手算：isRational = !(hasAllergy || (patientAge >= 75 && drugName.includes('抗生素')))
  // 测试2：drugName='布洛芬', patientAge=45, hasAllergy=false
  //   = !(false || (45>=75 && ...)) = !(false || false) = !(false) = true
  // 测试3：drugName='青霉素', patientAge=50, hasAllergy=true
  //   = !(true || ...) = !(true) = false
  const isRational = !(
    input.hasAllergy
    || (input.patientAge >= 75 && input.drugName.includes("抗生素"))
  );
  // 手算：advice = hasAllergy ? '处方过敏风险，建议换药'
  //   : (patientAge >= 75 && drugName.includes('抗生素')) ? '老年患者慎用抗生素，建议减量'
  //   : '处方合理'
  // 测试2：hasAllergy=false, 45>=75=false → advice='处方合理'
  // 测试3：hasAllergy=true → advice='处方过敏风险，建议换药'
  const advice = input.hasAllergy
    ? "处方过敏风险，建议换药"
    : (input.patientAge >= 75 && input.drugName.includes("抗生素"))
      ? "老年患者慎用抗生素，建议减量"
      : "处方合理";
  return { isRational, advice };
}

/**
 * 构建处方合理用药审查报告。
 *
 * @param result 处方审查结果
 * @returns 处方审查报告（isRational + advice 透传）
 */
export function buildAiPrescriptionRationalAuditReport(result: AiPrescriptionRationalAuditResultV14): AiPrescriptionRationalAuditReportV14 {
  // 手算：透传 isRational + advice
  // 测试4：{isRational=true, advice='处方合理'} → 透传
  return { isRational: result.isRational, advice: result.advice };
}
