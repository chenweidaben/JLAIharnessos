/**
 * 健澜科技 jlmedaios - 病历AI检验解读明细 V14 聚合器（M550-D，M550 收官）
 *
 * 纯函数：构建 AI 检验解读明细基础数据 + AI 检验解读明细 + 构建检验解读明细报告。
 * 避让说明：M545-D 已有 emrAiLabInterpretV14，本切片用 -detail 后缀避让。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 检验解读明细基础数据 */
export interface AiLabInterpretDetailV14 {
  recordId: string;
  dept: string;
}

/** AI 检验解读明细输入 */
export interface AiLabInterpretDetailInputV14 {
  item: string;
  value: number;
  refLow: number;
  refHigh: number;
}

/** AI 检验解读明细结果 */
export interface AiLabInterpretDetailResultV14 {
  status: string;
  advice: string;
}

/** 检验解读明细报告 */
export interface AiLabInterpretDetailReportV14 {
  status: string;
  advice: string;
}

/**
 * 构建 AI 检验解读明细基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 检验解读明细基础数据
 */
export function buildAiLabInterpretDetail(recordId: string, dept: string): AiLabInterpretDetailV14 {
  return { recordId, dept };
}

/**
 * AI 检验解读明细。
 * status = value < refLow ? '偏低' : value > refHigh ? '偏高' : '正常'
 * advice = status === '正常' ? '无需特殊处理' : status === '偏高' ? '建议复查并结合临床' : '建议补充营养并复查'
 *
 * @param input 检验解读明细输入（检验项目 + 数值 + 参考下限 + 参考上限）
 * @returns 检验解读明细结果（status + advice）
 */
export function interpretLabByAi(input: AiLabInterpretDetailInputV14): AiLabInterpretDetailResultV14 {
  // 手算：status = value < refLow ? '偏低' : value > refHigh ? '偏高' : '正常'
  // 测试2：item='血糖', value=8.5, refLow=3.9, refHigh=6.1 → 8.5 > 6.1 → status='偏高'
  // 测试3：item='白细胞', value=6.0, refLow=4.0, refHigh=10.0 → 4.0 <= 6.0 <= 10.0 → status='正常'
  const status = input.value < input.refLow ? "偏低" : input.value > input.refHigh ? "偏高" : "正常";
  // 手算：advice = status === '正常' ? '无需特殊处理' : status === '偏高' ? '建议复查并结合临床' : '建议补充营养并复查'
  // 测试2：status='偏高' → advice='建议复查并结合临床'
  // 测试3：status='正常' → advice='无需特殊处理'
  const advice = status === "正常" ? "无需特殊处理" : status === "偏高" ? "建议复查并结合临床" : "建议补充营养并复查";
  return { status, advice };
}

/**
 * 构建检验解读明细报告。
 *
 * @param result 检验解读明细结果
 * @returns 检验解读明细报告（status + advice 透传）
 */
export function buildAiLabInterpretDetailReport(result: AiLabInterpretDetailResultV14): AiLabInterpretDetailReportV14 {
  // 手算：透传 status + advice
  // 测试4：{status='偏高', advice='...'} → 透传
  return { status: result.status, advice: result.advice };
}
