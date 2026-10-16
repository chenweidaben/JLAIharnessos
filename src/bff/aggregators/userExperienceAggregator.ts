/**
 * 健澜科技 jlmedaios - 用户体验深化纯函数（M199-A）
 *
 * buildUserExperienceReport / scoreUserExperience / optimizeUserJourney
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 用户反馈 */
export interface UserFeedback {
  satisfaction: number;
  nps: number;
  usabilityIssues: number;
}

/**
 * 用户体验评分（纯函数）。
 *
 * @param feedback 用户反馈
 * @returns 评分
 */
export function scoreUserExperience(feedback: UserFeedback): { score: number; level: string } {
  let score = 0;
  score += Math.min(feedback.satisfaction, 100) * 0.5;
  score += (feedback.nps + 100) / 2;
  score -= feedback.usabilityIssues * 2;
  score = Math.max(0, Math.min(100, Math.round(score)));
  const level = score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor';
  return { score, level };
}

/** 旅程数据 */
export interface JourneyData {
  steps: number;
  dropOffRate: number;
  avgTimeMinutes: number;
}

/**
 * 用户旅程优化（纯函数）。
 *
 * @param journey 旅程数据
 * @returns 优化建议
 */
export function optimizeUserJourney(journey: JourneyData): { suggestions: string[]; estimatedImprovement: number } {
  const suggestions: string[] = [];
  let improvement = 0;
  if (journey.steps > 5) {
    suggestions.push('精简就医步骤');
    improvement += 20;
  }
  if (journey.dropOffRate > 0.3) {
    suggestions.push('优化关键转化节点');
    improvement += 15;
  }
  if (journey.avgTimeMinutes > 30) {
    suggestions.push('缩短平均耗时');
    improvement += 10;
  }
  return { suggestions, estimatedImprovement: improvement };
}

/** 用户体验报告输出 */
export interface UserExperienceReport {
  timeRange: string;
  design: { system: boolean; components: number; reviews: number };
  journey: { patient: number; clinician: number; admin: number };
  research: { interviews: number; usabilityTests: number; satisfaction: number; nps: number };
  interaction: { consistency: number };
  visual: { darkMode: boolean };
  responsive: { mobileCoverage: number };
  performance: { firstScreenMs: number; interactionMs: number };
  suggestions: string[];
}

/**
 * 构建用户体验报告。
 *
 * @param timeRange 时间范围
 * @returns 用户体验报告
 */
export function buildUserExperienceReport(timeRange: string): UserExperienceReport {
  const feedback: UserFeedback = { satisfaction: 85, nps: 40, usabilityIssues: 5 };
  const score = scoreUserExperience(feedback);

  return {
    timeRange,
    design: { system: true, components: 200, reviews: 10 },
    journey: { patient: 5, clinician: 3, admin: 2 },
    research: { interviews: 30, usabilityTests: 15, satisfaction: feedback.satisfaction, nps: feedback.nps },
    interaction: { consistency: 0.9 },
    visual: { darkMode: true },
    responsive: { mobileCoverage: 0.95 },
    performance: { firstScreenMs: 1200, interactionMs: 100 },
    suggestions: [`体验评分 ${score.score}（${score.level}）`, '优化患者就医旅程', '提升移动端覆盖'],
  };
}
