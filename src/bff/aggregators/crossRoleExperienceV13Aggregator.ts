/**
 * 健澜科技 jlmedaios - 跨角色经验安全复用 V13 纯函数（M295-A）
 *
 * buildCrossRoleExperienceV13 / scoreTransferabilityV13 / filterByRoleV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 经验条目 */
export interface ExperienceV13 {
  experienceId: string;
  sourceRole: "doctor" | "nurse" | "pharma" | "manager";
  title: string;
  condition: string;
  action: string;
  diseaseRelevance: number;
  actionExecutable: number;
  riskLevel: number;
}

/** 适配后经验 */
export interface AdaptedExperienceV13 {
  experienceId: string;
  sourceRole: string;
  targetRole: string;
  adaptedTitle: string;
  adaptedAction: string;
  transferabilityScore: number;
}

/**
 * 可迁移评分（纯函数）：diseaseRelevance×0.4 + actionExecutable×0.4 + riskLevel×0.2，0-100 整数。
 *
 * @param e 经验
 * @returns 评分
 */
export function scoreTransferabilityV13(e: ExperienceV13): number {
  const raw = e.diseaseRelevance * 0.4 + e.actionExecutable * 0.4 + e.riskLevel * 0.2;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/**
 * 按目标角色适配改写（纯函数）：医生结论→护士观察要点；医生用药→药师审核重点；不照搬。
 *
 * @param sourceRole 源角色
 * @param targetRole 目标角色
 * @param experience 经验
 * @returns 适配后经验
 */
export function buildCrossRoleExperienceV13(
  sourceRole: ExperienceV13["sourceRole"],
  targetRole: ExperienceV13["sourceRole"],
  experience: ExperienceV13,
): AdaptedExperienceV13 {
  let adaptedTitle = experience.title;
  let adaptedAction = experience.action;
  if (sourceRole === "doctor" && targetRole === "nurse") {
    adaptedTitle = `【护士观察】${experience.title}`;
    adaptedAction = `观察要点：${experience.action.replace(/处方|用药/g, "体征变化")}`;
  } else if (sourceRole === "doctor" && targetRole === "pharma") {
    adaptedTitle = `【药师审核】${experience.title}`;
    adaptedAction = `审核重点：${experience.action.replace(/诊断|开/g, "相互作用核对")}`;
  } else {
    adaptedTitle = `【${targetRole}参考】${experience.title}`;
  }
  return {
    experienceId: experience.experienceId,
    sourceRole,
    targetRole,
    adaptedTitle,
    adaptedAction,
    transferabilityScore: scoreTransferabilityV13(experience),
  };
}

/**
 * 按目标角色过滤可推送经验（纯函数）：sourceRole !== targetRole 且 score ≥ 50。
 *
 * @param experiences 经验列表
 * @param targetRole 目标角色
 * @returns 可推送经验
 */
export function filterByRoleV13(
  experiences: ExperienceV13[],
  targetRole: ExperienceV13["sourceRole"],
): ExperienceV13[] {
  return experiences.filter(
    (e) => e.sourceRole !== targetRole && scoreTransferabilityV13(e) >= 50,
  );
}
