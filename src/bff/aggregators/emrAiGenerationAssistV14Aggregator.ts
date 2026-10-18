/**
 * 健澜科技 jlmedaios - AI病历生成辅助 V14 聚合器（M522-A）
 *
 * 纯函数：构建生成辅助基础数据 + 生成病历草稿 + 构建设生成报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 生成辅助基础数据 */
export interface AiGenerationAssistV14 {
  recordType: string;
  dept: string;
}

/** 生成上下文 */
export interface AiGenerationContextV14 {
  recordType: string;
  dept: string;
  symptoms: string[];
}

/** 生成结果 */
export interface AiGenerationResultV14 {
  draftLength: number;
  fieldCount: number;
  confidence: number;
}

/** 生成报告 */
export interface AiGenerationReportV14 {
  draftLength: number;
  confidence: number;
  quality: string;
}

/**
 * 构建生成辅助基础数据。
 *
 * @param recordType 病历类型
 * @param dept 科室
 * @returns 生成辅助基础数据
 */
export function buildAiGenerationAssist(recordType: string, dept: string): AiGenerationAssistV14 {
  return { recordType, dept };
}

/**
 * 生成病历草稿。
 * draftLength = symptoms.join('').length × 10（向上取整）；fieldCount = symptoms.length + 3；confidence = 0.85 固定。
 *
 * @param context 生成上下文（病历类型/科室/症状列表）
 * @returns 生成结果（draftLength + fieldCount + confidence）
 */
export function generateMedicalRecordDraft(context: AiGenerationContextV14): AiGenerationResultV14 {
  // 手算：draftLength = symptoms.join('').length × 10
  // JS UTF-16：每个汉字 1 个 code unit，symptoms=['胸痛','胸闷','气促'] → join('')='胸痛胸闷气促' → length=6 → ×10=60
  // 空症状 → join('')='' → length=0 → ×10=0
  const joinedLength = context.symptoms.join("").length;
  const draftLength = Math.ceil(joinedLength * 10);
  // 手算：fieldCount = symptoms.length + 3
  // symptoms=['胸痛','胸闷','气促'] → 3+3=6；空 → 0+3=3
  const fieldCount = context.symptoms.length + 3;
  // 手算：confidence = 0.85 固定
  const confidence = 0.85;
  return { draftLength, fieldCount, confidence };
}

/**
 * 构建设生成报告。
 * confidence >= 0.8 → '高质量草稿'；>= 0.6 → '可用草稿'；否则 '需人工完善'。
 *
 * @param result 生成结果
 * @returns 生成报告（draftLength + confidence + quality）
 */
export function buildAiGenerationReport(result: { draftLength: number; confidence: number }): AiGenerationReportV14 {
  // 手算：confidence=0.85 >= 0.8 → '高质量草稿'
  let quality: string;
  if (result.confidence >= 0.8) {
    quality = "高质量草稿";
  } else if (result.confidence >= 0.6) {
    quality = "可用草稿";
  } else {
    quality = "需人工完善";
  }
  return { draftLength: result.draftLength, confidence: result.confidence, quality };
}
