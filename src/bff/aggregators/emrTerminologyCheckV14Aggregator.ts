/**
 * 健澜科技 jlmedaios - 病历术语规范检查 V14 聚合器（M485-C）
 *
 * 纯函数：术语规范检查 + 报告构建。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 术语规范检查结果 */
export interface TerminologyCheckResultV14 {
  content: string;
  issues: string[];
}

/** 术语规范报告 */
export interface TerminologyReportV14 {
  issueCount: number;
  score: number;
  issues: string[];
}

/** 口语化术语映射 */
const COLLOQUIAL_TERMS: { colloquial: string; standard: string }[] = [
  { colloquial: "拉肚子", standard: "腹泻" },
  { colloquial: "发烧", standard: "发热" },
  { colloquial: "头疼", standard: "头痛" },
];

/**
 * 检查口语化术语。
 *
 * @param content 病历正文
 * @returns 检查结果
 */
export function checkTerminology(content: string): TerminologyCheckResultV14 {
  const issues: string[] = [];
  for (const term of COLLOQUIAL_TERMS) {
    if (content.includes(term.colloquial)) {
      issues.push(`含口语化术语"${term.colloquial}"，建议改为"${term.standard}"`);
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
export function buildTerminologyReport(result: TerminologyCheckResultV14): TerminologyReportV14 {
  const issueCount = result.issues.length;
  const rawScore = 100 - issueCount * 5;
  const score = Math.max(0, Math.min(100, rawScore));
  return { issueCount, score, issues: result.issues };
}
