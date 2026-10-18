/**
 * 健澜科技 jlmedaios - 病历书写规范检查 V14 聚合器（M485-A）
 *
 * 纯函数：书写规范检查 + 报告构建。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 书写规范检查结果 */
export interface WritingStandardResultV14 {
  content: string;
  issues: string[];
}

/** 书写规范报告 */
export interface WritingStandardReportV14 {
  issueCount: number;
  score: number;
  issues: string[];
}

/** 模糊用语列表 */
const VAGUE_TERMS = ["大概", "可能", "好像", "差不多", "似乎", "估计"];

/**
 * 检查书写规范：检测模糊用语。
 *
 * @param content 病历正文
 * @returns 检查结果
 */
export function checkWritingStandard(content: string): WritingStandardResultV14 {
  const issues: string[] = [];
  for (const term of VAGUE_TERMS) {
    if (content.includes(term)) {
      issues.push(`含模糊用语"${term}"`);
    }
  }
  return { content, issues };
}

/**
 * 构建报告：score = 100 - issueCount × 5，clamp 0-100。
 *
 * @param result 检查结果
 * @returns 报告
 */
export function buildWritingStandardReport(result: WritingStandardResultV14): WritingStandardReportV14 {
  const issueCount = result.issues.length;
  const rawScore = 100 - issueCount * 5;
  const score = Math.max(0, Math.min(100, rawScore));
  return { issueCount, score, issues: result.issues };
}
