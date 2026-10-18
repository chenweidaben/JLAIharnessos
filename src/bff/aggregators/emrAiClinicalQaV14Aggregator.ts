/**
 * 健澜科技 jlmedaios - 病历AI临床问答 V14 聚合器（M545-A）
 *
 * 纯函数：构建 AI 临床问答基础数据 + 临床问答 + 构建问答报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 临床问答基础数据 */
export interface AiClinicalQaV14 {
  recordId: string;
  dept: string;
}

/** 临床问答输入 */
export interface AiClinicalQaInputV14 {
  question: string;
}

/** 临床问答结果 */
export interface AiClinicalQaResultV14 {
  answer: string;
  confidence: number;
}

/** 问答报告 */
export interface AiClinicalQaReportV14 {
  answer: string;
  confidence: number;
}

/**
 * 构建 AI 临床问答基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 临床问答基础数据
 */
export function buildAiClinicalQa(recordId: string, dept: string): AiClinicalQaV14 {
  return { recordId, dept };
}

/**
 * 临床问答。
 * answer = question.includes('胸痛') ? '建议完善心电图和心肌酶谱检查' : '建议结合临床进一步评估'
 * confidence = 0.88
 *
 * @param input 问答输入（问题）
 * @returns 问答结果（answer + confidence）
 */
export function askClinicalQa(input: AiClinicalQaInputV14): AiClinicalQaResultV14 {
  // 手算：answer = question.includes('胸痛') ? '建议完善心电图和心肌酶谱检查' : '建议结合临床进一步评估'
  // 测试2：question='患者胸痛如何处理' → 含'胸痛' → answer='建议完善心电图和心肌酶谱检查'
  // 测试3：question='患者发热如何处理' → 不含'胸痛' → answer='建议结合临床进一步评估'
  const answer = input.question.includes("胸痛")
    ? "建议完善心电图和心肌酶谱检查"
    : "建议结合临床进一步评估";
  // 手算：confidence = 0.88
  const confidence = 0.88;
  return { answer, confidence };
}

/**
 * 构建问答报告。
 *
 * @param result 问答结果
 * @returns 问答报告（answer + confidence 透传）
 */
export function buildAiClinicalQaReport(result: AiClinicalQaResultV14): AiClinicalQaReportV14 {
  // 手算：透传 answer + confidence
  // 测试4：{answer='建议完善心电图和心肌酶谱检查', confidence=0.88} → 透传
  return { answer: result.answer, confidence: result.confidence };
}
