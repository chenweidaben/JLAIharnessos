/**
 * 健澜科技 jlmedaios - 智能体采纳率反馈看板 V12 纯函数（M294-A）
 *
 * buildAdoptionBoardV12 / computeAdoptionRateV12 / detectLowAdoptionV12
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 智能体建议 */
export interface SuggestionV12 {
  suggestionId: string;
  ruleId: string;
  status: "pending" | "adopted" | "corrected" | "rejected";
}

/** 用户反馈 */
export interface FeedbackV12 {
  feedbackId: string;
  suggestionId: string;
  type: "adopt" | "correct" | "reject";
}

/** 看板条目 */
export interface AdoptionBoardRowV12 {
  ruleId: string;
  suggestCount: number;
  adoptCount: number;
  correctCount: number;
  rejectCount: number;
  adoptionRate: number;
  autoDowngrade: boolean;
}

/** 看板结果 */
export interface AdoptionBoardV12 {
  ruleId: string;
  rows: AdoptionBoardRowV12[];
  totalSuggestions: number;
  totalAdopt: number;
  overallAdoptionRate: number;
}

/**
 * 计算采纳率（纯函数）：采纳/总数×100，保留1位小数。total=0 返回0。
 *
 * @param adoptCount 采纳数
 * @param totalCount 总数
 * @returns 百分比
 */
export function computeAdoptionRateV12(adoptCount: number, totalCount: number): number {
  if (totalCount <= 0) return 0;
  return Math.round((adoptCount / totalCount) * 1000) / 10;
}

/**
 * 低采纳率检测（纯函数）：rate<50 → autoDowngrade=true。
 *
 * @param rate 采纳率百分比
 * @returns 是否低采纳
 */
export function detectLowAdoptionV12(rate: number): { autoDowngrade: boolean; message: string } {
  const low = rate < 50;
  return {
    autoDowngrade: low,
    message: low ? "采纳率偏低，建议复训或降权" : "采纳率正常",
  };
}

/**
 * 采纳率看板聚合（纯函数）：按 ruleId 分组统计建议状态与反馈。
 *
 * @param ruleId 主规则ID（返回时作为 header）
 * @param suggestions 建议列表
 * @param feedback 反馈列表
 * @returns 看板
 */
export function buildAdoptionBoardV12(
  ruleId: string,
  suggestions: SuggestionV12[],
  feedback: FeedbackV12[],
): AdoptionBoardV12 {
  const byRule = new Map<string, { adopt: number; correct: number; reject: number; suggest: number }>();
  for (const s of suggestions) {
    const cur = byRule.get(s.ruleId) ?? { adopt: 0, correct: 0, reject: 0, suggest: 0 };
    cur.suggest += 1;
    byRule.set(s.ruleId, cur);
  }
  const suggestionById = new Map(suggestions.map((s) => [s.suggestionId, s]));
  for (const f of feedback) {
    const s = suggestionById.get(f.suggestionId);
    if (!s) continue;
    const cur = byRule.get(s.ruleId) ?? { adopt: 0, correct: 0, reject: 0, suggest: 0 };
    if (f.type === "adopt") cur.adopt += 1;
    else if (f.type === "correct") cur.correct += 1;
    else cur.reject += 1;
    byRule.set(s.ruleId, cur);
  }
  const rows: AdoptionBoardRowV12[] = [...byRule.entries()].map(([rid, v]) => {
    const total = v.adopt + v.correct + v.reject;
    const rate = computeAdoptionRateV12(v.adopt, total);
    const { autoDowngrade } = detectLowAdoptionV12(rate);
    return {
      ruleId: rid,
      suggestCount: v.suggest,
      adoptCount: v.adopt,
      correctCount: v.correct,
      rejectCount: v.reject,
      adoptionRate: rate,
      autoDowngrade,
    };
  });
  const totalSuggestions = suggestions.length;
  const totalAdopt = rows.reduce((s, r) => s + r.adoptCount, 0);
  const totalFeedback = rows.reduce((s, r) => s + r.adoptCount + r.correctCount + r.rejectCount, 0);
  return {
    ruleId,
    rows,
    totalSuggestions,
    totalAdopt,
    overallAdoptionRate: computeAdoptionRateV12(totalAdopt, totalFeedback),
  };
}
