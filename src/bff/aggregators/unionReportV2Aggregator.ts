/**
 * 健澜科技 jlmedaios - 工会群团 V2 纯函数（M228-D）
 *
 * buildUnionReportV2 / assessUnionSatisfaction / organizeUnionActivity
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估工会满意度（纯函数）。
 *
 * @param surveys 调研样本数
 * @returns 满意度
 */
export function assessUnionSatisfaction(surveys: number): { rate: number; level: string } {
  let level = '一般';
  if (surveys >= 90) level = '高';
  else if (surveys >= 75) level = '良好';
  return { rate: surveys, level };
}

/**
 * 组织工会活动（纯函数）。
 *
 * @param activity 活动名称
 * @returns 参与人数
 */
export function organizeUnionActivity(activity: string): { participants: number; success: boolean } {
  let participants = 100;
  let success = true;
  if (activity.includes('体育')) participants = 300;
  else if (activity.includes('文艺')) participants = 200;
  return { participants, success };
}

/** 工会群团 V2 报告输出 */
export interface UnionReportV2 {
  timeRange: string;
  organization: { committee: number; branches: number };
  democracy: { congress: number; openAffairs: boolean; evaluation: number };
  welfare: { holiday: number; subsidy: number; eap: number };
  activities: { held: number };
  female: { screening: number };
  youth: { members: number };
  retiree: { retirees: number };
  help: { families: number };
  suggestions: string[];
}

/**
 * 构建工会群团 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 工会群团 V2 报告
 */
export function buildUnionReportV2(timeRange: string): UnionReportV2 {
  return {
    timeRange,
    organization: { committee: 1, branches: 20 },
    democracy: { congress: 1, openAffairs: true, evaluation: 500 },
    welfare: { holiday: 4, subsidy: 30, eap: 100 },
    activities: { held: 15 },
    female: { screening: 200 },
    youth: { members: 100 },
    retiree: { retirees: 300 },
    help: { families: 20 },
    suggestions: ['丰富工会活动形式', '加强困难职工帮扶'],
  };
}
