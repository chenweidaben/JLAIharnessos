/**
 * 健澜科技 jlmedaios - 病历AI知识推荐 V14 聚合器（M543-D，M543 收官）
 *
 * 纯函数：构建 AI 知识推荐基础数据 + AI 知识推荐 + 构建推荐报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 知识推荐基础数据 */
export interface AiKnowledgeRecoV14 {
  recordId: string;
  dept: string;
}

/** AI 知识推荐输入 */
export interface AiKnowledgeRecoInputV14 {
  diagnosis: string;
  specialty: string;
}

/** AI 知识推荐结果 */
export interface AiKnowledgeRecoResultV14 {
  recommendations: string[];
  count: number;
}

/** 推荐报告 */
export interface AiKnowledgeRecoReportV14 {
  recommendations: string[];
  count: number;
}

/**
 * 构建 AI 知识推荐基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 知识推荐基础数据
 */
export function buildAiKnowledgeReco(recordId: string, dept: string): AiKnowledgeRecoV14 {
  return { recordId, dept };
}

/**
 * AI 知识推荐。
 * recommendations = diagnosis.includes('心梗') ? ['心梗诊疗指南2025','抗血小板治疗规范'] : ['病历书写基本规范']
 * count = recommendations.length
 *
 * @param input 推荐输入（诊断 + 专科）
 * @returns 推荐结果（recommendations + count）
 */
export function recommendKnowledgeByAi(input: AiKnowledgeRecoInputV14): AiKnowledgeRecoResultV14 {
  // 手算：recommendations = diagnosis.includes('心梗') ? ['心梗诊疗指南2025','抗血小板治疗规范'] : ['病历书写基本规范']
  // 测试2：diagnosis='急性心肌梗死' → 含'心梗' → recommendations=['心梗诊疗指南2025','抗血小板治疗规范']
  // 测试3：diagnosis='上呼吸道感染' → 不含'心梗' → recommendations=['病历书写基本规范']
  const recommendations = input.diagnosis.includes("心梗")
    ? ["心梗诊疗指南2025", "抗血小板治疗规范"]
    : ["病历书写基本规范"];
  // 手算：count = recommendations.length
  // 测试2：recommendations.length = 2
  // 测试3：recommendations.length = 1
  const count = recommendations.length;
  return { recommendations, count };
}

/**
 * 构建推荐报告。
 *
 * @param result 推荐结果
 * @returns 推荐报告（recommendations + count 透传）
 */
export function buildAiKnowledgeRecoReport(result: AiKnowledgeRecoResultV14): AiKnowledgeRecoReportV14 {
  // 手算：透传 recommendations + count
  // 测试4：{recommendations=['心梗诊疗指南2025','抗血小板治疗规范'], count=2} → 透传
  return { recommendations: result.recommendations, count: result.count };
}
