/**
 * 健澜科技 jlmedaios - 病历AI用药建议 V14 聚合器（M545-C）
 *
 * 纯函数：构建 AI 用药建议基础数据 + AI 用药建议 + 构建用药报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 用药建议基础数据 */
export interface AiMedRecoV14 {
  recordId: string;
  dept: string;
}

/** AI 用药建议输入 */
export interface AiMedRecoInputV14 {
  diagnosis: string;
  age: number;
}

/** AI 用药建议结果 */
export interface AiMedRecoResultV14 {
  meds: string[];
  caution: string;
}

/** 用药报告 */
export interface AiMedRecoReportV14 {
  meds: string[];
  caution: string;
}

/**
 * 构建 AI 用药建议基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 用药建议基础数据
 */
export function buildAiMedReco(recordId: string, dept: string): AiMedRecoV14 {
  return { recordId, dept };
}

/**
 * AI 用药建议。
 * meds = diagnosis.includes('心梗') ? ['阿司匹林','他汀'] : ['对症治疗']
 * caution = age > 70 ? '注意老年患者剂量调整' : '常规剂量'
 *
 * @param input 用药建议输入（诊断 + 年龄）
 * @returns 用药建议结果（meds + caution）
 */
export function recommendMedByAi(input: AiMedRecoInputV14): AiMedRecoResultV14 {
  // 手算：meds = diagnosis.includes('心梗') ? ['阿司匹林','他汀'] : ['对症治疗']
  // 测试2：diagnosis='急性心梗' → 含'心梗' → meds=['阿司匹林','他汀']
  // 测试3：diagnosis='上感' → 不含'心梗' → meds=['对症治疗']
  const meds = input.diagnosis.includes("心梗")
    ? ["阿司匹林", "他汀"]
    : ["对症治疗"];
  // 手算：caution = age > 70 ? '注意老年患者剂量调整' : '常规剂量'
  // 测试2：age=75 > 70 → caution='注意老年患者剂量调整'
  // 测试3：age=40 <= 70 → caution='常规剂量'
  const caution = input.age > 70 ? "注意老年患者剂量调整" : "常规剂量";
  return { meds, caution };
}

/**
 * 构建用药报告。
 *
 * @param result 用药建议结果
 * @returns 用药报告（meds + caution 透传）
 */
export function buildAiMedRecoReport(result: AiMedRecoResultV14): AiMedRecoReportV14 {
  // 手算：透传 meds + caution
  // 测试4：{meds=['阿司匹林','他汀'], caution='注意老年患者剂量调整'} → 透传
  return { meds: result.meds, caution: result.caution };
}
