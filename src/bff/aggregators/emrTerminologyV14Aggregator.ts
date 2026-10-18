/**
 * 健澜科技 jlmedaios - 病历术语规范 V14 聚合器（M477-C）
 *
 * 纯函数：口语化术语识别 + 标准化转换。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 术语规范检查结果 */
export interface TerminologyResultV14 {
  issueCount: number;
  issues: string[];
  suggestions: string[];
}

/** 口语化术语对照映射 */
const COLLOQUIAL_MAP: Record<string, string> = {
  "拉肚子": "腹泻",
  "发烧": "发热",
  "心口疼": "胸痛",
  "头疼": "头痛",
  "肚子痛": "腹痛",
};

/**
 * 将口语化术语标准化为医学术语。
 *
 * @param term 术语
 * @returns 标准化后的医学术语（无匹配则原样返回）
 */
export function normalizeTerminology(term: string): string {
  for (const [colloquial, standard] of Object.entries(COLLOQUIAL_MAP)) {
    if (term === colloquial || term.includes(colloquial)) {
      return term.replace(colloquial, standard);
    }
  }
  return term;
}

/**
 * 检查病历文本术语规范性，检测口语化/不规范术语。
 *
 * @param text 病历文本
 * @returns 术语规范检查结果
 */
export function checkTerminology(text: string): TerminologyResultV14 {
  const issues: string[] = [];
  const suggestions: string[] = [];
  for (const [colloquial, standard] of Object.entries(COLLOQUIAL_MAP)) {
    if (text.includes(colloquial)) {
      issues.push(`含口语化术语"${colloquial}"`);
      suggestions.push(`建议改为"${standard}"`);
    }
  }
  return { issueCount: issues.length, issues, suggestions };
}
