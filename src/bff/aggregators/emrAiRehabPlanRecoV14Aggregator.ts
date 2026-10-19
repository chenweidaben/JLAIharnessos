/**
 * 健澜科技 jlmedaios - 病历AI康复训练方案推荐 V14 聚合器（M563-B）
 *
 * 纯函数：构建 AI 康复训练方案推荐基础数据 + AI 康复训练方案推荐 + 构建康复训练方案推荐报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 康复训练方案推荐基础数据 */
export interface AiRehabPlanRecoV14 {
  recordId: string;
  dept: string;
}

/** AI 康复训练方案推荐输入 */
export interface AiRehabPlanRecoInputV14 {
  diagnosis: string;
  rehabLevel: string;
}

/** AI 康复训练方案推荐结果 */
export interface AiRehabPlanRecoResultV14 {
  planName: string;
  frequency: string;
}

/** 康复训练方案推荐报告 */
export interface AiRehabPlanRecoReportV14 {
  planName: string;
  frequency: string;
}

/**
 * 构建 AI 康复训练方案推荐基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 康复训练方案推荐基础数据
 */
export function buildAiRehabPlanReco(recordId: string, dept: string): AiRehabPlanRecoV14 {
  return { recordId, dept };
}

/**
 * AI 康复训练方案推荐。
 * planName = diagnosis.includes('卒中') ? '卒中康复训练方案'
 *   : diagnosis.includes('骨折') ? '骨折术后康复训练方案' : '常规康复训练方案'
 * frequency = rehabLevel === '重度' ? '每日2次'
 *   : rehabLevel === '中度' ? '每日1次' : '每周3次'
 *
 * @param input 康复训练方案推荐输入（诊断 + 康复等级）
 * @returns 康复训练方案推荐结果（planName + frequency）
 */
export function recommendRehabPlanByAi(input: AiRehabPlanRecoInputV14): AiRehabPlanRecoResultV14 {
  // 手算：planName = diagnosis.includes('卒中') ? '卒中康复训练方案'
  //   : diagnosis.includes('骨折') ? '骨折术后康复训练方案' : '常规康复训练方案'
  // 测试2：diagnosis='脑卒中后偏瘫' → includes('卒中')=true → '卒中康复训练方案'
  // 测试3：diagnosis='膝关节骨关节炎' → includes('卒中')=false, includes('骨折')=false → '常规康复训练方案'
  const planName = input.diagnosis.includes("卒中")
    ? "卒中康复训练方案"
    : input.diagnosis.includes("骨折")
      ? "骨折术后康复训练方案"
      : "常规康复训练方案";
  // 手算：frequency = rehabLevel === '重度' ? '每日2次'
  //   : rehabLevel === '中度' ? '每日1次' : '每周3次'
  // 测试2：rehabLevel='重度' → '每日2次'
  // 测试3：rehabLevel='轻度' → '每周3次'
  const frequency = input.rehabLevel === "重度" ? "每日2次"
    : input.rehabLevel === "中度" ? "每日1次" : "每周3次";
  return { planName, frequency };
}

/**
 * 构建康复训练方案推荐报告。
 *
 * @param result 康复训练方案推荐结果
 * @returns 康复训练方案推荐报告（planName + frequency 透传）
 */
export function buildAiRehabPlanRecoReport(result: AiRehabPlanRecoResultV14): AiRehabPlanRecoReportV14 {
  // 手算：透传 planName + frequency
  // 测试4：{planName='卒中康复训练方案', frequency='每日2次'} → 透传
  return { planName: result.planName, frequency: result.frequency };
}
