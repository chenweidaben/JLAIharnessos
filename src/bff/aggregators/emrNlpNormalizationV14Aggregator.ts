/**
 * 健澜科技 jlmedaios - NLP 病历标准化 V14 聚合器（M491-B）
 *
 * 纯函数：病历文本标准化（口语→医学术语）+ 标准化报告构建。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 标准化建议 */
export interface NormalizationV14 {
  original: string;
  normalized: string;
}

/** 标准化结果 */
export interface NlpNormalizationResultV14 {
  normalizations: NormalizationV14[];
}

/** 标准化报告 */
export interface NlpNormalizationReportV14 {
  normalizationCount: number;
}

/** 口语→医学术语词典（模拟 NLP 标准化） */
const NORMALIZATION_DICT: { original: string; normalized: string }[] = [
  { original: "拉肚子", normalized: "腹泻" },
  { original: "发烧", normalized: "发热" },
  { original: "心慌", normalized: "心悸" },
  { original: "拉肚子拉水", normalized: "水样泻" },
];

/**
 * 标准化病历文本（口语→医学术语，模拟 NLP 标准化）。
 *
 * @param content 病历原文
 * @returns 标准化结果
 */
export function normalizeMedicalText(content: string): NlpNormalizationResultV14 {
  if (!content) {
    return { normalizations: [] };
  }
  // 手算：遍历标准化词典，口语命中则生成标准化建议
  const normalizations: NormalizationV14[] = [];
  for (const item of NORMALIZATION_DICT) {
    if (content.includes(item.original)) {
      normalizations.push({ original: item.original, normalized: item.normalized });
    }
  }
  return { normalizations };
}

/**
 * 构建标准化报告（normalizationCount）。
 *
 * @param result 标准化结果
 * @returns 标准化报告
 */
export function buildNormalizationReport(result: NlpNormalizationResultV14): NlpNormalizationReportV14 {
  // 手算：normalizationCount = normalizations.length
  return { normalizationCount: result.normalizations.length };
}
