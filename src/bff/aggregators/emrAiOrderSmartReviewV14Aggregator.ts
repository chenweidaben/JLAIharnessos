/**
 * 健澜科技 jlmedaios - 病历AI医嘱智能审核 V14 聚合器（M558-A）
 *
 * 纯函数：构建 AI 医嘱智能审核基础数据 + AI 医嘱智能审核 + 构建医嘱智能审核报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 医嘱智能审核基础数据 */
export interface AiOrderSmartReviewV14 {
  recordId: string;
  dept: string;
}

/** AI 医嘱智能审核输入 */
export interface AiOrderSmartReviewInputV14 {
  drugName: string;
  dosage: string;
  patientAge: number;
}

/** AI 医嘱智能审核结果 */
export interface AiOrderSmartReviewResultV14 {
  isAppropriate: boolean;
  advice: string;
}

/** 医嘱智能审核报告 */
export interface AiOrderSmartReviewReportV14 {
  isAppropriate: boolean;
  advice: string;
}

/**
 * 构建 AI 医嘱智能审核基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 医嘱智能审核基础数据
 */
export function buildAiOrderSmartReview(recordId: string, dept: string): AiOrderSmartReviewV14 {
  return { recordId, dept };
}

/**
 * AI 医嘱智能审核。
 * isAppropriate = !(patientAge >= 75 && drugName.includes('抗生素') && dosage.includes('大剂量'))
 * advice = !isAppropriate ? '建议调整剂量或更换药物' : '医嘱合理'
 *
 * @param input 医嘱审核输入（药品名称 + 剂量 + 年龄）
 * @returns 医嘱审核结果（isAppropriate + advice）
 */
export function reviewOrderByAi(input: AiOrderSmartReviewInputV14): AiOrderSmartReviewResultV14 {
  // 手算：isAppropriate = !(patientAge >= 75 && drugName.includes('抗生素') && dosage.includes('大剂量'))
  // 测试2：drugName='布洛芬', dosage='常规剂量', patientAge=45
  //   = !(45>=75 && ... && ...) = !(false && ...) = !(false) = true
  // 测试3：drugName='头孢类抗生素', dosage='大剂量', patientAge=80
  //   = !(80>=75 && '头孢类抗生素'.includes('抗生素') && '大剂量'.includes('大剂量'))
  //   = !(true && true && true) = !(true) = false
  const isAppropriate = !(
    input.patientAge >= 75
    && input.drugName.includes("抗生素")
    && input.dosage.includes("大剂量")
  );
  // 手算：advice = !isAppropriate ? '建议调整剂量或更换药物' : '医嘱合理'
  // 测试2：isAppropriate=true → advice='医嘱合理'
  // 测试3：isAppropriate=false → advice='建议调整剂量或更换药物'
  const advice = !isAppropriate ? "建议调整剂量或更换药物" : "医嘱合理";
  return { isAppropriate, advice };
}

/**
 * 构建医嘱智能审核报告。
 *
 * @param result 医嘱审核结果
 * @returns 医嘱审核报告（isAppropriate + advice 透传）
 */
export function buildAiOrderSmartReviewReport(result: AiOrderSmartReviewResultV14): AiOrderSmartReviewReportV14 {
  // 手算：透传 isAppropriate + advice
  // 测试4：{isAppropriate=true, advice='医嘱合理'} → 透传
  return { isAppropriate: result.isAppropriate, advice: result.advice };
}
