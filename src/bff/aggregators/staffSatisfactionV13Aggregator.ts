/**
 * 健澜科技 jlmedaios - 员工满意度 V13 纯函数（M322-C）
 *
 * computeGroupSatisfactionV13 / computeTurnoverIntentionRateV13 / buildStaffSatisfactionOverviewV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 员工满意度调查 */
export interface StaffSurveyV13 {
  surveyId: string;
  group: "doctor" | "nurse" | "admin";
  satisfaction: number;
  intendsToLeave: boolean;
}

/** 群体满意度均分 */
export interface GroupSatisfactionV13 {
  doctor: number;
  nurse: number;
  admin: number;
}

/** 员工满意度总览 */
export interface StaffSatisfactionOverviewV13 {
  groupSatisfaction: GroupSatisfactionV13;
  turnoverIntentionRate: number;
}

/**
 * 群体满意度均分（纯函数）：按医师/护士/行政分组求均值。
 *
 * @param surveys 调查列表
 * @param group 群体
 * @returns 满意度均分（四舍五入）
 */
export function computeGroupSatisfactionV13(surveys: StaffSurveyV13[], group: "doctor" | "nurse" | "admin"): number {
  const groupSurveys = surveys.filter((s) => s.group === group);
  if (groupSurveys.length === 0) return 0;
  const sum = groupSurveys.reduce((acc, s) => acc + s.satisfaction, 0);
  return Math.round(sum / groupSurveys.length);
}

/**
 * 离职倾向占比（纯函数）：选择"打算离职"的人数/总人数×100。
 *
 * @param surveys 调查列表
 * @returns 离职倾向占比百分比
 */
export function computeTurnoverIntentionRateV13(surveys: StaffSurveyV13[]): number {
  if (surveys.length === 0) return 0;
  const leaving = surveys.filter((s) => s.intendsToLeave).length;
  return Math.round((leaving / surveys.length) * 100);
}

/**
 * 总览汇总（纯函数）：3 群体满意度 + 离职倾向。
 *
 * @param surveys 调查列表
 * @returns 总览汇总
 */
export function buildStaffSatisfactionOverviewV13(surveys: StaffSurveyV13[]): StaffSatisfactionOverviewV13 {
  return {
    groupSatisfaction: {
      doctor: computeGroupSatisfactionV13(surveys, "doctor"),
      nurse: computeGroupSatisfactionV13(surveys, "nurse"),
      admin: computeGroupSatisfactionV13(surveys, "admin"),
    },
    turnoverIntentionRate: computeTurnoverIntentionRateV13(surveys),
  };
}
