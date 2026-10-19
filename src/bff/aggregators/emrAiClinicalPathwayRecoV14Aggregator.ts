/**
 * 健澜科技 jlmedaios - 病历AI临床路径推荐 V14 聚合器（M554-A）
 *
 * 纯函数：构建 AI 临床路径推荐基础数据 + AI 临床路径推荐 + 构建临床路径推荐报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 临床路径推荐基础数据 */
export interface AiClinicalPathwayRecoV14 {
  recordId: string;
  dept: string;
}

/** AI 临床路径推荐输入 */
export interface AiClinicalPathwayRecoInputV14 {
  diagnosis: string;
  age: number;
}

/** AI 临床路径推荐结果 */
export interface AiClinicalPathwayRecoResultV14 {
  pathwayName: string;
  days: number;
}

/** 临床路径推荐报告 */
export interface AiClinicalPathwayRecoReportV14 {
  pathwayName: string;
  days: number;
}

/**
 * 构建 AI 临床路径推荐基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 临床路径推荐基础数据
 */
export function buildAiClinicalPathwayReco(recordId: string, dept: string): AiClinicalPathwayRecoV14 {
  return { recordId, dept };
}

/**
 * AI 临床路径推荐。
 * pathwayName = diagnosis.includes('心梗') ? '急性心梗临床路径' : diagnosis.includes('肺炎') ? '社区获得性肺炎路径' : '常见病诊疗路径'
 * days = pathwayName.includes('心梗') ? 7 : pathwayName.includes('肺炎') ? 5 : 3
 *
 * @param input 临床路径推荐输入（诊断 + 年龄）
 * @returns 临床路径推荐结果（pathwayName + days）
 */
export function recommendClinicalPathwayByAi(input: AiClinicalPathwayRecoInputV14): AiClinicalPathwayRecoResultV14 {
  // 手算：pathwayName = diagnosis.includes('心梗') ? '急性心梗临床路径' : diagnosis.includes('肺炎') ? '社区获得性肺炎路径' : '常见病诊疗路径'
  // 测试2：diagnosis='急性心梗' → includes('心梗')=true → pathwayName='急性心梗临床路径'
  // 测试3：diagnosis='上呼吸道感染' → 不含心梗/肺炎 → pathwayName='常见病诊疗路径'
  const pathwayName = input.diagnosis.includes("心梗")
    ? "急性心梗临床路径"
    : input.diagnosis.includes("肺炎")
      ? "社区获得性肺炎路径"
      : "常见病诊疗路径";
  // 手算：days = pathwayName.includes('心梗') ? 7 : pathwayName.includes('肺炎') ? 5 : 3
  // 测试2：pathwayName='急性心梗临床路径' → includes('心梗')=true → days=7
  // 测试3：pathwayName='常见病诊疗路径' → 不含心梗/肺炎 → days=3
  const days = pathwayName.includes("心梗") ? 7 : pathwayName.includes("肺炎") ? 5 : 3;
  return { pathwayName, days };
}

/**
 * 构建临床路径推荐报告。
 *
 * @param result 临床路径推荐结果
 * @returns 临床路径推荐报告（pathwayName + days 透传）
 */
export function buildAiClinicalPathwayRecoReport(result: AiClinicalPathwayRecoResultV14): AiClinicalPathwayRecoReportV14 {
  // 手算：透传 pathwayName + days
  // 测试4：{pathwayName='急性心梗临床路径', days=7} → 透传
  return { pathwayName: result.pathwayName, days: result.days };
}
