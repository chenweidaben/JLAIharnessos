/**
 * 健澜科技 jlmedaios - 个人学习曲线里程碑 V13 纯函数（M309-D）
 *
 * evaluateLearningMilestoneV13 / awardBadgeV13 / buildDoctorBadgeBoardV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医生里程碑 */
export interface DoctorMilestoneV13 {
  doctorId: string;
  name: string;
  score: number;
  badges: string[];
}

/** 徽章 */
export interface BadgeV13 {
  badgeName: string;
  unlockedAt: string;
}

/**
 * 评估里程碑（纯函数）：0-30 入门 / 30-60 熟练 / 60-80 精通 / 80+ 专家。
 *
 * @param doctorScore 医生分
 * @returns 里程碑等级
 */
export function evaluateLearningMilestoneV13(doctorScore: number): string {
  if (doctorScore >= 80) return "专家";
  if (doctorScore >= 60) return "精通";
  if (doctorScore >= 30) return "熟练";
  return "入门";
}

/**
 * 发徽章（纯函数）：达到新等级时触发。
 *
 * @param doctor 医生
 * @param milestone 里程碑
 * @returns 徽章
 */
export function awardBadgeV13(doctor: DoctorMilestoneV13, milestone: string): BadgeV13 {
  return {
    badgeName: `${milestone}达成`,
    unlockedAt: new Date().toISOString().slice(0, 10),
  };
}

/**
 * 徽章墙（纯函数）：按徽章数降序。
 *
 * @param doctors 医生列表
 * @returns 排序后
 */
export function buildDoctorBadgeBoardV13(doctors: DoctorMilestoneV13[]): DoctorMilestoneV13[] {
  return [...doctors].sort((a, b) => b.badges.length - a.badges.length);
}
