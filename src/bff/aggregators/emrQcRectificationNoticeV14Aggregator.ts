/**
 * 健澜科技 jlmedaios - 质控整改通知单自动生成 V14 聚合器（M518-C）
 *
 * 纯函数：构建通知单基础数据 + 生成通知单统计 + 构建通知单摘要。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 通知单基础数据 */
export interface RectificationNoticeV14 {
  noticeId: string;
  dept: string;
  issue: string;
}

/** 通知单缺陷统计 */
export interface RectificationDefectsV14 {
  block: number;
  major: number;
  minor: number;
}

/** 通知单生成结果 */
export interface RectificationResultV14 {
  defectCount: number;
  score: number;
  deadlineDays: number;
}

/** 通知单摘要 */
export interface RectificationSummaryV14 {
  priority: string;
}

/**
 * 构建通知单基础数据。
 *
 * @param noticeId 通知单号
 * @param dept 科室
 * @param issue 问题描述
 * @returns 通知单基础数据
 */
export function buildRectificationNotice(noticeId: string, dept: string, issue: string): RectificationNoticeV14 {
  return { noticeId, dept, issue };
}

/**
 * 生成通知单统计。
 * defectCount=block+major+minor；score=100-block×15-major×8-minor×3，clamp 0-100；deadlineDays=Math.ceil(deadlineDays)。
 *
 * @param notice 通知单基础数据
 * @param defects 缺陷统计
 * @param deadlineDays 整改期限（天）
 * @returns 通知单生成结果（defectCount + score + deadlineDays）
 */
export function generateRectificationNotice(
  notice: RectificationNoticeV14,
  defects: RectificationDefectsV14,
  deadlineDays: number,
): RectificationResultV14 {
  // 手算：defectCount = block + major + minor
  const defectCount = defects.block + defects.major + defects.minor;
  // 手算：扣分 = block×15 + major×8 + minor×3；score = 100 - 扣分，clamp 0-100
  const deduction = defects.block * 15 + defects.major * 8 + defects.minor * 3;
  let score = 100 - deduction;
  if (score < 0) score = 0;
  if (score > 100) score = 100;
  // 手算：deadlineDays 向上取整
  const days = Math.ceil(deadlineDays);
  // 避免未使用变量警告
  void notice;
  return { defectCount, score, deadlineDays: days };
}

/**
 * 构建通知单摘要。
 * score<60→'紧急'，<80→'重要'，否则'一般'。
 *
 * @param result 通知单生成结果（只需 score）
 * @returns 通知单摘要（priority）
 */
export function buildRectificationNoticeSummary(result: { score: number; defectCount?: number }): RectificationSummaryV14 {
  // 手算：score<60→紧急，<80→重要，否则一般
  let priority = "一般";
  if (result.score < 60) {
    priority = "紧急";
  } else if (result.score < 80) {
    priority = "重要";
  }
  return { priority };
}
