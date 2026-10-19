/**
 * 健澜科技 jlmedaios - 病历AI处方前置审核 V14 聚合器（M565-A）
 *
 * 纯函数：构建 AI 处方前置审核基础数据 + AI 处方前置审核 + 构建处方前置审核报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 处方前置审核基础数据 */
export interface AiPrePrescriptionReviewV14 {
  recordId: string;
  dept: string;
}

/** AI 处方前置审核输入 */
export interface AiPrePrescriptionReviewInputV14 {
  drugName: string;
  patientAge: number;
  hasAllergy: boolean;
}

/** AI 处方前置审核结果 */
export interface AiPrePrescriptionReviewResultV14 {
  pass: boolean;
  reason: string;
}

/** 处方前置审核报告 */
export interface AiPrePrescriptionReviewReportV14 {
  pass: boolean;
  reason: string;
}

/**
 * 构建 AI 处方前置审核基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 处方前置审核基础数据
 */
export function buildAiPrePrescriptionReview(recordId: string, dept: string): AiPrePrescriptionReviewV14 {
  return { recordId, dept };
}

/**
 * AI 处方前置审核。
 * pass = !(hasAllergy && drugName.includes('青霉素'))
 * reason = !pass ? '过敏禁忌' : '处方审核通过'
 *
 * @param input 处方前置审核输入（药品名称 + 患者年龄 + 是否过敏）
 * @returns 处方前置审核结果（pass + reason）
 */
export function reviewPrePrescriptionByAi(input: AiPrePrescriptionReviewInputV14): AiPrePrescriptionReviewResultV14 {
  // 手算：pass = !(hasAllergy && drugName.includes('青霉素'))
  // 测试2：hasAllergy=true, drugName='青霉素V钾片'.includes('青霉素')=true
  //   → !(true && true) = !true = false
  // 测试3：hasAllergy=false → !(false && ...) = !false = true
  const pass = !(input.hasAllergy && input.drugName.includes("青霉素"));
  // 手算：reason = !pass ? '过敏禁忌' : '处方审核通过'
  // 测试2：pass=false → '过敏禁忌'
  // 测试3：pass=true → '处方审核通过'
  const reason = !pass ? "过敏禁忌" : "处方审核通过";
  return { pass, reason };
}

/**
 * 构建处方前置审核报告。
 *
 * @param result 处方前置审核结果
 * @returns 处方前置审核报告（pass + reason 透传）
 */
export function buildAiPrePrescriptionReviewReport(result: AiPrePrescriptionReviewResultV14): AiPrePrescriptionReviewReportV14 {
  // 手算：透传 pass + reason
  // 测试4：{pass=true, reason='处方审核通过'} → 透传
  return { pass: result.pass, reason: result.reason };
}
