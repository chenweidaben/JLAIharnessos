/**
 * 健澜科技 jlmedaios - 病历AI护理建议 V14 聚合器（M546-C，-suggest 后缀避让旧作废 -reco）
 *
 * 纯函数：构建 AI 护理建议基础数据 + AI 护理建议 + 构建护理报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 护理建议基础数据 */
export interface AiNursingSuggestV14 {
  recordId: string;
  dept: string;
}

/** AI 护理建议输入 */
export interface AiNursingSuggestInputV14 {
  diagnosis: string;
  age: number;
}

/** AI 护理建议结果 */
export interface AiNursingSuggestResultV14 {
  level: string;
  items: string[];
}

/** 护理报告 */
export interface AiNursingSuggestReportV14 {
  level: string;
  items: string[];
}

/**
 * 构建 AI 护理建议基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 护理建议基础数据
 */
export function buildAiNursingSuggest(recordId: string, dept: string): AiNursingSuggestV14 {
  return { recordId, dept };
}

/**
 * AI 护理建议。
 * level = diagnosis.includes('心梗') || age > 75 ? '特级护理' : '一级护理'
 * items = level === '特级护理' ? ['心电监护','吸氧','绝对卧床'] : ['生命体征监测','用药观察']
 *
 * @param input 护理建议输入（诊断 + 年龄）
 * @returns 护理建议结果（level + items）
 */
export function suggestNursingByAi(input: AiNursingSuggestInputV14): AiNursingSuggestResultV14 {
  // 手算：level = diagnosis.includes('心梗') || age > 75 ? '特级护理' : '一级护理'
  // 测试2：diagnosis='急性心梗' → 含'心梗' → level='特级护理'
  // 测试3：diagnosis='上感', age=40 → 不含'心梗'且 40<=75 → level='一级护理'
  const level = input.diagnosis.includes("心梗") || input.age > 75 ? "特级护理" : "一级护理";
  // 手算：items = level === '特级护理' ? ['心电监护','吸氧','绝对卧床'] : ['生命体征监测','用药观察']
  // 测试2：level='特级护理' → items=['心电监护','吸氧','绝对卧床']
  // 测试3：level='一级护理' → items=['生命体征监测','用药观察']
  const items = level === "特级护理" ? ["心电监护", "吸氧", "绝对卧床"] : ["生命体征监测", "用药观察"];
  return { level, items };
}

/**
 * 构建护理报告。
 *
 * @param result 护理建议结果
 * @returns 护理报告（level + items 透传）
 */
export function buildAiNursingSuggestReport(result: AiNursingSuggestResultV14): AiNursingSuggestReportV14 {
  // 手算：透传 level + items
  // 测试4：{level='特级护理', items=['心电监护','吸氧','绝对卧床']} → 透传
  return { level: result.level, items: result.items };
}
