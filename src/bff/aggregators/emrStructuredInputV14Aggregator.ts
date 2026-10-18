/**
 * 健澜科技 jlmedaios - 病历结构化录入辅助 V14 聚合器（M539-B）
 *
 * 纯函数：构建结构化录入基础数据 + 录入辅助 + 构建录入报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 结构化录入基础数据 */
export interface StructuredInputV14 {
  recordId: string;
  fieldName: string;
}

/** 录入辅助输入 */
export interface StructuredInputInputV14 {
  rawText: string;
  fieldType: string;
}

/** 录入辅助结果 */
export interface StructuredInputResultV14 {
  filled: boolean;
  suggestedValue: string;
}

/** 录入报告 */
export interface StructuredInputReportV14 {
  filled: boolean;
  suggestedValue: string;
}

/**
 * 构建结构化录入基础数据。
 *
 * @param recordId 病历ID
 * @param fieldName 字段名
 * @returns 结构化录入基础数据
 */
export function buildStructuredInput(recordId: string, fieldName: string): StructuredInputV14 {
  return { recordId, fieldName };
}

/**
 * 录入辅助。
 * filled = rawText.length > 0
 * suggestedValue = rawText.length > 0 ? rawText : '请输入' + fieldType
 *
 * @param input 录入输入（原始文本 + 字段类型）
 * @returns 录入结果（filled + suggestedValue）
 */
export function assistStructuredInput(input: StructuredInputInputV14): StructuredInputResultV14 {
  // 手算：filled = rawText.length > 0
  // 测试2：rawText='胸闷3天' → length=4 > 0 → filled=true
  // 测试3：rawText='' → length=0 → filled=false
  const filled = input.rawText.length > 0;
  // 手算：suggestedValue = rawText.length > 0 ? rawText : '请输入' + fieldType
  // 测试2：rawText='胸闷3天' → suggestedValue='胸闷3天'
  // 测试3：rawText='' → suggestedValue='请输入' + '主诉' = '请输入主诉'
  const suggestedValue = input.rawText.length > 0 ? input.rawText : "请输入" + input.fieldType;
  return { filled, suggestedValue };
}

/**
 * 构建录入报告。
 *
 * @param result 录入结果
 * @returns 录入报告（filled + suggestedValue 透传）
 */
export function buildStructuredInputReport(result: StructuredInputResultV14): StructuredInputReportV14 {
  // 手算：透传 filled + suggestedValue
  // 测试4：{filled=true, suggestedValue='胸闷3天'} → filled=true, suggestedValue='胸闷3天'
  return { filled: result.filled, suggestedValue: result.suggestedValue };
}
