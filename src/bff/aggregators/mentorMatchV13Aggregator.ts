/**
 * 健澜科技 jlmedaios - 新手医生孵化与导师匹配 V13 纯函数（M298-C）
 *
 * matchMentorV13 / buildOnboardingPlanV13 / trackMentoringProgressV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 导师 */
export interface MentorV13 {
  doctorId: string;
  name: string;
  dept: string;
  score: number;
}

/** 新手医生 */
export interface NewDoctorV13 {
  doctorId: string;
  name: string;
  dept: string;
}

/** 入职计划 */
export interface OnboardingPlanV13 {
  newDoctorId: string;
  mentorId: string;
  mentorName: string;
  experienceCount: number;
  totalMinutes: number;
}

/** 师徒进度 */
export interface MentoringProgressV13 {
  newDoctorId: string;
  completionRate: number;
  remainingMinutes: number;
}

/**
 * 导师匹配（纯函数）：同科室分数最高者优先。
 *
 * @param newDoctor 新手医生
 * @param mentors 候选导师
 * @returns 最佳导师（无同科室则 null）
 */
export function matchMentorV13(
  newDoctor: NewDoctorV13,
  mentors: MentorV13[],
): MentorV13 | null {
  const sameDept = mentors
    .filter((m) => m.dept === newDoctor.dept)
    .sort((a, b) => b.score - a.score);
  return sameDept[0] ?? null;
}

/**
 * 入职学习计划（纯函数）：导师经验数×15 分钟。
 *
 * @param newDoctor 新手
 * @param mentor 导师
 * @returns 计划
 */
export function buildOnboardingPlanV13(
  newDoctor: NewDoctorV13,
  mentor: MentorV13,
): OnboardingPlanV13 {
  const experienceCount = Math.max(5, Math.round(mentor.score / 10));
  return {
    newDoctorId: newDoctor.doctorId,
    mentorId: mentor.doctorId,
    mentorName: mentor.name,
    experienceCount,
    totalMinutes: experienceCount * 15,
  };
}

/**
 * 师徒进度追踪（纯函数）：完成率 + 剩余时长。
 *
 * @param plan 入职计划
 * @param studiedCount 已学数
 * @returns 进度
 */
export function trackMentoringProgressV13(
  plan: OnboardingPlanV13,
  studiedCount: number,
): MentoringProgressV13 {
  const rate = plan.experienceCount === 0
    ? 0
    : Math.round((studiedCount / plan.experienceCount) * 1000) / 10;
  const remaining = (plan.experienceCount - studiedCount) * 15;
  return {
    newDoctorId: plan.newDoctorId,
    completionRate: rate,
    remainingMinutes: remaining,
  };
}
