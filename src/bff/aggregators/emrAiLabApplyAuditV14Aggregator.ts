/**
 * 健澜科技 jlmedaios - 病历AI检验申请合理性审查 V14 聚合器（M561-B）
 *
 * 纯函数：构建 AI 检验申请合理性审查基础数据 + AI 检验申请合理性审查 + 构建检验申请合理性审查报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 检验申请合理性审查基础数据 */
export interface AiLabApplyAuditV14 {
  recordId: string;
  dept: string;
}

/** AI 检验申请合理性审查输入 */
export interface AiLabApplyAuditInputV14 {
  testName: string;
  patientAge: number;
  hasResult: boolean;
}

/** AI 检验申请合理性审查结果 */
export interface AiLabApplyAuditResultV14 {
  isRational: boolean;
  advice: string;
}

/** 检验申请合理性审查报告 */
export interface AiLabApplyAuditReportV14 {
  isRational: boolean;
  advice: string;
}

/**
 * 构建 AI 检验申请合理性审查基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 检验申请合理性审查基础数据
 */
export function buildAiLabApplyAudit(recordId: string, dept: string): AiLabApplyAuditV14 {
  return { recordId, dept };
}

/**
 * AI 检验申请合理性审查。
 * isRational = !(patientAge >= 75 && testName.includes('肿瘤标志物') && !hasResult)
 * advice = !isRational ? '老年患者肿瘤标志物筛查建议先常规检查' : '检验申请合理'
 *
 * @param input 检验申请合理性审查输入（检验项目 + 年龄 + 是否已有结果）
 * @returns 检验申请合理性审查结果（isRational + advice）
 */
export function auditLabApplyByAi(input: AiLabApplyAuditInputV14): AiLabApplyAuditResultV14 {
  // 手算：isRational = !(patientAge >= 75 && testName.includes('肿瘤标志物') && !hasResult)
  // 测试2：testName='血常规', patientAge=45, hasResult=true
  //   = !(45>=75=false && ...) = !(false) = true
  // 测试3：testName='肿瘤标志物全套', patientAge=80, hasResult=false
  //   = !(80>=75=true && '肿瘤标志物全套'.includes('肿瘤标志物')=true && !hasResult=true)
  //   = !(true) = false
  const isRational = !(input.patientAge >= 75
    && input.testName.includes("肿瘤标志物")
    && !input.hasResult);
  // 手算：advice = !isRational ? '老年患者肿瘤标志物筛查建议先常规检查' : '检验申请合理'
  // 测试2：isRational=true → '检验申请合理'
  // 测试3：isRational=false → '老年患者肿瘤标志物筛查建议先常规检查'
  const advice = !isRational
    ? "老年患者肿瘤标志物筛查建议先常规检查"
    : "检验申请合理";
  return { isRational, advice };
}

/**
 * 构建检验申请合理性审查报告。
 *
 * @param result 检验申请合理性审查结果
 * @returns 检验申请合理性审查报告（isRational + advice 透传）
 */
export function buildAiLabApplyAuditReport(result: AiLabApplyAuditResultV14): AiLabApplyAuditReportV14 {
  // 手算：透传 isRational + advice
  // 测试4：{isRational=true, advice='检验申请合理'} → 透传
  return { isRational: result.isRational, advice: result.advice };
}
