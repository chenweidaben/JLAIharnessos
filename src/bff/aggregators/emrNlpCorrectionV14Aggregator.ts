/**
 * 健澜科技 jlmedaios - NLP 病历纠错 V14 聚合器（M491-A）
 *
 * 纯函数：病历文本纠错 + 纠错报告构建。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 纠错建议 */
export interface CorrectionV14 {
  original: string;
  corrected: string;
}

/** 纠错结果 */
export interface NlpCorrectionResultV14 {
  corrections: CorrectionV14[];
}

/** 纠错报告 */
export interface NlpCorrectionReportV14 {
  correctionCount: number;
}

/** 常见错别字词典（模拟 NLP 纠错） */
const TYPO_DICT: { original: string; corrected: string }[] = [
  { original: "腹泄", corrected: "腹泻" },
  { original: "高血亚", corrected: "高血压" },
  { original: "糖鸟病", corrected: "糖尿病" },
  { original: "头通", corrected: "头痛" },
];

/**
 * 纠错病历文本（错别字/格式错误，模拟 NLP 纠错）。
 *
 * @param content 病历原文
 * @returns 纠错结果
 */
export function correctMedicalText(content: string): NlpCorrectionResultV14 {
  if (!content) {
    return { corrections: [] };
  }
  // 手算：遍历错别字词典，原文命中则生成纠错建议
  const corrections: CorrectionV14[] = [];
  for (const typo of TYPO_DICT) {
    if (content.includes(typo.original)) {
      corrections.push({ original: typo.original, corrected: typo.corrected });
    }
  }
  return { corrections };
}

/**
 * 构建纠错报告（correctionCount）。
 *
 * @param result 纠错结果
 * @returns 纠错报告
 */
export function buildCorrectionReport(result: NlpCorrectionResultV14): NlpCorrectionReportV14 {
  // 手算：correctionCount = corrections.length
  return { correctionCount: result.corrections.length };
}
