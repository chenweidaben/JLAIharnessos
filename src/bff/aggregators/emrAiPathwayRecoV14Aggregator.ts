/**
 * 健澜科技 jlmedaios - 病历AI临床路径推荐 V14 聚合器（M546-A）
 *
 * 纯函数：构建 AI 临床路径推荐基础数据 + AI 临床路径推荐 + 构建路径报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 临床路径推荐基础数据 */
export interface AiPathwayRecoV14 {
  recordId: string;
  dept: string;
}

/** AI 临床路径推荐输入 */
export interface AiPathwayRecoInputV14 {
  diagnosis: string;
}

/** AI 临床路径推荐结果 */
export interface AiPathwayRecoResultV14 {
  pathwayName: string;
  days: number;
}

/** 路径报告 */
export interface AiPathwayRecoReportV14 {
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
export function buildAiPathwayReco(recordId: string, dept: string): AiPathwayRecoV14 {
  return { recordId, dept };
}

/**
 * AI 临床路径推荐。
 * pathwayName = diagnosis.includes('心梗') ? '急性心梗临床路径' : '普通常见病路径'
 * days = pathwayName.includes('心梗') ? 7 : 5
 *
 * @param input 路径推荐输入（诊断）
 * @returns 路径推荐结果（pathwayName + days）
 */
export function recommendPathwayByAi(input: AiPathwayRecoInputV14): AiPathwayRecoResultV14 {
  // 手算：pathwayName = diagnosis.includes('心梗') ? '急性心梗临床路径' : '普通常见病路径'
  // 测试2：diagnosis='急性心梗' → 含'心梗' → pathwayName='急性心梗临床路径'
  // 测试3：diagnosis='上呼吸道感染' → 不含'心梗' → pathwayName='普通常见病路径'
  const pathwayName = input.diagnosis.includes("心梗") ? "急性心梗临床路径" : "普通常见病路径";
  // 手算：days = pathwayName.includes('心梗') ? 7 : 5
  // 测试2：pathwayName='急性心梗临床路径' → 含'心梗' → days=7
  // 测试3：pathwayName='普通常见病路径' → 不含'心梗' → days=5
  const days = pathwayName.includes("心梗") ? 7 : 5;
  return { pathwayName, days };
}

/**
 * 构建路径报告。
 *
 * @param result 路径推荐结果
 * @returns 路径报告（pathwayName + days 透传）
 */
export function buildAiPathwayRecoReport(result: AiPathwayRecoResultV14): AiPathwayRecoReportV14 {
  // 手算：透传 pathwayName + days
  // 测试4：{pathwayName='急性心梗临床路径', days=7} → 透传
  return { pathwayName: result.pathwayName, days: result.days };
}
