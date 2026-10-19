/**
 * 健澜科技 jlmedaios - 病历AI麻醉深度监测建议 V14 聚合器（M562-C）
 *
 * 纯函数：构建 AI 麻醉深度监测建议基础数据 + AI 麻醉深度监测建议 + 构建麻醉深度监测建议报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 麻醉深度监测建议基础数据 */
export interface AiAnesthesiaDepthSuggestV14 {
  recordId: string;
  dept: string;
}

/** AI 麻醉深度监测建议输入 */
export interface AiAnesthesiaDepthSuggestInputV14 {
  surgeryType: string;
  patientAge: number;
}

/** AI 麻醉深度监测建议结果 */
export interface AiAnesthesiaDepthSuggestResultV14 {
  bisTarget: number;
  monitoringAdvice: string;
}

/** 麻醉深度监测建议报告 */
export interface AiAnesthesiaDepthSuggestReportV14 {
  bisTarget: number;
  monitoringAdvice: string;
}

/**
 * 构建 AI 麻醉深度监测建议基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 麻醉深度监测建议基础数据
 */
export function buildAiAnesthesiaDepthSuggest(recordId: string, dept: string): AiAnesthesiaDepthSuggestV14 {
  return { recordId, dept };
}

/**
 * AI 麻醉深度监测建议。
 * bisTarget = surgeryType.includes('心脏') ? 35
 *   : patientAge >= 70 ? 45 : 50
 * monitoringAdvice = patientAge >= 70
 *   ? '老年患者建议每15分钟记录一次BIS值' : '常规监测即可'
 *
 * @param input 麻醉深度监测建议输入（手术类型 + 年龄）
 * @returns 麻醉深度监测建议结果（bisTarget + monitoringAdvice）
 */
export function suggestAnesthesiaDepthByAi(input: AiAnesthesiaDepthSuggestInputV14): AiAnesthesiaDepthSuggestResultV14 {
  // 手算：bisTarget = surgeryType.includes('心脏') ? 35
  //   : patientAge >= 70 ? 45 : 50
  // 测试2：surgeryType='心脏搭桥手术' → includes('心脏')=true → 35
  // 测试3：surgeryType='胆囊切除术' → includes('心脏')=false；patientAge=75>=70 → 45
  const bisTarget = input.surgeryType.includes("心脏")
    ? 35
    : input.patientAge >= 70
      ? 45
      : 50;
  // 手算：monitoringAdvice = patientAge >= 70
  //   ? '老年患者建议每15分钟记录一次BIS值' : '常规监测即可'
  // 测试2：patientAge=60 >= 70=false → '常规监测即可'
  // 测试3：patientAge=75 >= 70=true → '老年患者建议每15分钟记录一次BIS值'
  const monitoringAdvice = input.patientAge >= 70
    ? "老年患者建议每15分钟记录一次BIS值"
    : "常规监测即可";
  return { bisTarget, monitoringAdvice };
}

/**
 * 构建麻醉深度监测建议报告。
 *
 * @param result 麻醉深度监测建议结果
 * @returns 麻醉深度监测建议报告（bisTarget + monitoringAdvice 透传）
 */
export function buildAiAnesthesiaDepthSuggestReport(result: AiAnesthesiaDepthSuggestResultV14): AiAnesthesiaDepthSuggestReportV14 {
  // 手算：透传 bisTarget + monitoringAdvice
  // 测试4：{bisTarget=35, monitoringAdvice='常规监测即可'} → 透传
  return { bisTarget: result.bisTarget, monitoringAdvice: result.monitoringAdvice };
}
