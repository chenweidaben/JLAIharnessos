/**
 * 健澜科技 jlmedaios - 病历术语标准词库 V14（M464-B）
 *
 * 纯数据词库：标准词→同义词数组，反向查找同义词→标准词。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 标准词→同义词数组 */
export const STANDARD_TERMS_V14: Record<string, string[]> = {
  "高血压病": ["高血压", "血压高", "HTN"],
  "2型糖尿病": ["糖尿病", "DM", "消渴"],
  "冠状动脉粥样硬化性心脏病": ["冠心病", "CHD"],
  "急性上呼吸道感染": ["感冒", "上感"],
};

/**
 * 反向查找：从同义词查标准词。
 *
 * @param synonym 同义词
 * @returns 标准词（未命中返回 null）
 */
export function lookupStandardTerm(synonym: string): string | null {
  for (const [standard, synonyms] of Object.entries(STANDARD_TERMS_V14)) {
    if (synonyms.includes(synonym)) return standard;
  }
  return null;
}

/**
 * 对输入文本中的不规范词给出纠错建议。
 *
 * @param nonStandard 输入文本
 * @returns 纠错建议列表
 */
export function suggestCorrections(nonStandard: string): { input: string; standard: string }[] {
  const suggestions: { input: string; standard: string }[] = [];
  for (const [standard, synonyms] of Object.entries(STANDARD_TERMS_V14)) {
    for (const syn of synonyms) {
      if (nonStandard.includes(syn)) {
        suggestions.push({ input: syn, standard });
      }
    }
  }
  return suggestions;
}
