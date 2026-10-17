/**
 * 健澜科技 jlmedaios - 跨科室经验扩散 V13 纯函数（M304-A）
 *
 * scoreDiffusionPotentialV13 / findAdoptableDepartmentsV13 / broadcastExperienceV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 经验 */
export interface DeptExperienceV13 {
  experienceId: string;
  title: string;
  evidenceStrength: number;
  generalityScore: number;
  coveredDepts: string[];
}

/** 科室 */
export interface DepartmentV13 {
  deptId: string;
  deptName: string;
}

/** 广播通知 */
export interface BroadcastNoticeV13 {
  experienceId: string;
  experienceTitle: string;
  targetDept: string;
  message: string;
}

/**
 * 扩散潜力分（纯函数）：evidenceStrength×100 + generalityScore×50 + coveredDepts.length×10，保留1位。
 *
 * @param experience 经验
 * @returns 潜力分
 */
export function scoreDiffusionPotentialV13(experience: DeptExperienceV13): number {
  const raw =
    experience.evidenceStrength * 100 +
    experience.generalityScore * 50 +
    experience.coveredDepts.length * 10;
  return Math.round(raw * 10) / 10;
}

/**
 * 候选科室（纯函数）：experience.coveredDepts 已收录之外的。
 *
 * @param experience 经验
 * @param allDepartments 所有科室
 * @returns 候选
 */
export function findAdoptableDepartmentsV13(
  experience: DeptExperienceV13,
  allDepartments: DepartmentV13[],
): DepartmentV13[] {
  const covered = new Set(experience.coveredDepts);
  return allDepartments.filter((d) => !covered.has(d.deptId));
}

/**
 * 广播通知（纯函数）：每条候选科室一条待收录通知。
 *
 * @param experience 经验
 * @param candidates 候选科室
 * @returns 通知列表
 */
export function broadcastExperienceV13(
  experience: DeptExperienceV13,
  candidates: DepartmentV13[],
): BroadcastNoticeV13[] {
  return candidates.map((c) => ({
    experienceId: experience.experienceId,
    experienceTitle: experience.title,
    targetDept: c.deptId,
    message: `建议将经验"${experience.title}"收录到${c.deptName}`,
  }));
}
