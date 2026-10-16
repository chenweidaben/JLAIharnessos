/**
 * 健澜科技 jlmedaios - 党建管理纯函数（M194-A）
 *
 * buildPartyBuildingReport / scorePartyBuilding / generatePartyBuildingSuggestion
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 党建数据 */
export interface PartyBuildingData {
  partyOrgCount: number;
  partyMemberRate: number;
  threeMeetingsPerQuarter: number;
  themePartyDayPerMonth: number;
  educationHours: number;
  activitiesCount: number;
  integrityTrainingCount: number;
}

/**
 * 党建评分（纯函数）。
 *
 * @param data 党建数据
 * @returns 0-100 分
 */
export function scorePartyBuilding(data: PartyBuildingData): number {
  let score = 0;
  score += Math.min(data.partyOrgCount * 5, 20);
  score += data.partyMemberRate * 20;
  score += Math.min(data.threeMeetingsPerQuarter * 2, 15);
  score += Math.min(data.educationHours / 10, 20);
  score += Math.min(data.activitiesCount * 2, 15);
  score += Math.min(data.integrityTrainingCount * 2, 10);
  return Math.min(100, Math.round(score));
}

/**
 * 党建改进建议生成（纯函数）。
 *
 * @param scoreResult 评分结果
 * @returns 建议列表
 */
export function generatePartyBuildingSuggestion(scoreResult: { score: number; gaps: string[] }): string[] {
  const suggestions: string[] = [];
  if (scoreResult.score < 80) {
    suggestions.push('加强党支部标准化建设');
    suggestions.push('丰富主题党日活动形式');
    suggestions.push('加大党员教育力度');
  } else {
    suggestions.push('打造党建品牌特色');
    suggestions.push('发挥党员先锋模范作用');
  }
  return suggestions;
}

/** 党建报告输出 */
export interface PartyBuildingReport {
  dept: string;
  timeRange: string;
  organization: { committee: number; branch: number; memberRate: number };
  memberDevelopment: { newMembers: number; applicants: number };
  life: { threeMeetings: number; themePartyDay: number;组织生活会: number };
  education: { hours: number; xuexiQiangguoRate: number };
  activities: { count: number; participants: number };
  integrity: { trainingCount: number };
  score: number;
  suggestions: string[];
}

/**
 * 构建党建报告。
 *
 * @param dept 科室
 * @param timeRange 时间范围
 * @returns 党建报告
 */
export function buildPartyBuildingReport(dept: string, timeRange: string): PartyBuildingReport {
  const pData: PartyBuildingData = {
    partyOrgCount: 25,
    partyMemberRate: 0.35,
    threeMeetingsPerQuarter: 4,
    themePartyDayPerMonth: 1,
    educationHours: 30,
    activitiesCount: 6,
    integrityTrainingCount: 4,
  };

  const score = scorePartyBuilding(pData);
  const gaps = ['部分党支部组织生活不规范'];
  const suggestions = generatePartyBuildingSuggestion({ score, gaps });

  return {
    dept,
    timeRange,
    organization: { committee: 2, branch: 25, memberRate: 0.35 },
    memberDevelopment: { newMembers: 8, applicants: 20 },
    life: { threeMeetings: 12, themePartyDay: 10, 组织生活会: 4 },
    education: { hours: 30, xuexiQiangguoRate: 0.95 },
    activities: { count: 6, participants: 500 },
    integrity: { trainingCount: 4 },
    score,
    suggestions,
  };
}
