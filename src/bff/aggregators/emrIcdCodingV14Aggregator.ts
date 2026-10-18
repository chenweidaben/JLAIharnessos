/**
 * 健澜科技 jlmedaios - ICD 编码辅助与校对 V14 聚合器（M464-A）
 *
 * 纯函数：基于关键词规则匹配（不调 LLM）+ ICD-10 格式校验。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** ICD 编码建议项 */
export interface IcdCodeSuggestionV14 {
  code: string;
  name: string;
}

/** 内置 ICD-10 小型词表（关键词 → 编码） */
const ICD_VOCAB: { keyword: string; code: string; name: string }[] = [
  { keyword: "肺炎", code: "J18.9", name: "肺炎" },
  { keyword: "高血压", code: "I10", name: "高血压" },
  { keyword: "糖尿病", code: "E11.9", name: "2型糖尿病" },
  { keyword: "冠心病", code: "I25.1", name: "冠心病" },
  { keyword: "阑尾炎", code: "K35.9", name: "急性阑尾炎" },
];

/** ICD-10 格式正则：字母+2位数字+可选.小数（1-3位） */
const ICD_PATTERN = /^[A-Z]\d{2}(\.\d{1,3})?$/;

/**
 * 从文本中匹配关键词，返回 ICD-10 编码建议列表。
 *
 * @param text 病历文本
 * @returns 编码建议列表
 */
export function suggestIcdCodes(text: string): IcdCodeSuggestionV14[] {
  const suggestions: IcdCodeSuggestionV14[] = [];
  for (const entry of ICD_VOCAB) {
    if (text.includes(entry.keyword)) {
      suggestions.push({ code: entry.code, name: entry.name });
    }
  }
  return suggestions;
}

/**
 * 校验 ICD-10 编码格式。
 *
 * @param code 待校验编码
 * @returns 是否符合格式
 */
export function validateIcdCode(code: string): boolean {
  return ICD_PATTERN.test(code);
}
