/**
 * 健澜科技 jlmedaios - 病历AI检验解读 V14 聚合器（M545-D，M545 收官）
 *
 * 纯函数：构建 AI 检验解读基础数据 + AI 检验解读 + 构建检验解读报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 检验解读基础数据 */
export interface AiLabInterpretV14 {
  recordId: string;
  dept: string;
}

/** AI 检验解读输入 */
export interface AiLabInterpretInputV14 {
  item: string;
  value: number;
  refRange: string;
}

/** AI 检验解读结果 */
export interface AiLabInterpretResultV14 {
  level: string;
  suggestion: string;
}

/** 检验解读报告 */
export interface AiLabInterpretReportV14 {
  level: string;
  suggestion: string;
}

/**
 * 构建 AI 检验解读基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 检验解读基础数据
 */
export function buildAiLabInterpret(recordId: string, dept: string): AiLabInterpretV14 {
  return { recordId, dept };
}

/**
 * AI 检验解读。
 * level = item.includes('肌钙蛋白') && value > 0.04 ? '显著升高' : '正常'
 * suggestion = level === '显著升高' ? '警惕急性心梗可能' : '建议结合临床'
 *
 * @param input 检验解读输入（检验项目 + 数值 + 参考范围）
 * @returns 检验解读结果（level + suggestion）
 */
export function interpretLabByAi(input: AiLabInterpretInputV14): AiLabInterpretResultV14 {
  // 手算：level = item.includes('肌钙蛋白') && value > 0.04 ? '显著升高' : '正常'
  // 测试2：item='肌钙蛋白I', value=0.5 → 含'肌钙蛋白'且 0.5>0.04 → level='显著升高'
  // 测试3：item='白细胞', value=6.0 → 不含'肌钙蛋白' → level='正常'
  const level = input.item.includes("肌钙蛋白") && input.value > 0.04 ? "显著升高" : "正常";
  // 手算：suggestion = level === '显著升高' ? '警惕急性心梗可能' : '建议结合临床'
  // 测试2：level='显著升高' → suggestion='警惕急性心梗可能'
  // 测试3：level='正常' → suggestion='建议结合临床'
  const suggestion = level === "显著升高" ? "警惕急性心梗可能" : "建议结合临床";
  return { level, suggestion };
}

/**
 * 构建检验解读报告。
 *
 * @param result 检验解读结果
 * @returns 检验解读报告（level + suggestion 透传）
 */
export function buildAiLabInterpretReport(result: AiLabInterpretResultV14): AiLabInterpretReportV14 {
  // 手算：透传 level + suggestion
  // 测试4：{level='显著升高', suggestion='警惕急性心梗可能'} → 透传
  return { level: result.level, suggestion: result.suggestion };
}
