/**
 * 健澜科技 jlmedaios - 病历规范性检查 V14 聚合器（M476-D，M476 收官）
 *
 * 纯函数：模糊用语识别 + 规范性检查。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 规范性检查结果 */
export interface NormativityResultV14 {
  issueCount: number;
  issues: string[];
  passed: boolean;
}

/** 不规范关键词（模糊表述） */
const NON_NORMATIVE_WORDS: string[] = [
  "大概",
  "可能",
  "好像",
  "差不多",
  "似乎",
  "估计",
];

/**
 * 找出不规范描述：识别模糊用语。
 *
 * @param content 病历正文
 * @returns 不规范问题列表
 */
export function findNormativityIssues(content: string): string[] {
  const issues: string[] = [];
  for (const word of NON_NORMATIVE_WORDS) {
    if (content.includes(word)) {
      issues.push(`含模糊用语"${word}"，建议改为具体描述`);
    }
  }
  return issues;
}

/**
 * 检查病历规范性。
 *
 * @param content 病历正文
 * @returns 规范性检查结果
 */
export function checkNormativity(content: string): NormativityResultV14 {
  const issues = findNormativityIssues(content);
  const issueCount = issues.length;
  return { issueCount, issues, passed: issueCount === 0 };
}
