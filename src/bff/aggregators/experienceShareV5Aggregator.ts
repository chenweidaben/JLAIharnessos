/**
 * 健澜科技 jlmedaios - 跨角色经验复用 V5 纯函数（M275-B）
 *
 * routeExperienceV5 / adaptForRoleV5 / measureReuseV5 / buildExperienceShareV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 经验 */
export interface ShareExperience {
  id: string;
  fromRole: string;
  specialty: string;
  situation: string;
  lesson: string;
  upvotes: number;
}

/** 共享规则 */
export interface ShareRule {
  experienceId: string;
  fromRole: string;
  toRoles: string[];
  visibility: "private" | "team" | "group" | "public";
  consumedCount: number;
}

/**
 * 经验路由 V5（纯函数）：根据源角色决定可推送的目标角色集合。
 *
 * @param fromRole 源角色
 * @returns 目标角色列表
 */
export function routeExperienceV5(fromRole: string): string[] {
  if (fromRole === "doctor") {
    return ["nurse", "pharmacist", "quality"];
  } else if (fromRole === "nurse") {
    return ["doctor", "patient"];
  } else if (fromRole === "pharmacist") {
    return ["doctor", "quality"];
  }
  return [];
}

/**
 * 为目标角色适配经验 V5（纯函数）。
 *
 * @param exp 经验
 * @param targetRole 目标角色
 * @returns 适配后文本
 */
export function adaptForRoleV5(exp: ShareExperience, targetRole: string): { adapted: string; role: string } {
  let adapted = exp.lesson;
  if (targetRole === "nurse") {
    adapted = `【护理要点】${exp.lesson}——关注患者体征观察与执行配合。`;
  } else if (targetRole === "pharmacist") {
    adapted = `【用药要点】${exp.lesson}——注意药物相互作用与给药时机。`;
  } else if (targetRole === "quality") {
    adapted = `【质控要点】${exp.lesson}——纳入质控指标追踪闭环。`;
  }
  return { adapted, role: targetRole };
}

/**
 * 复用度量 V5（纯函数）。
 *
 * @param rules 共享规则列表
 * @returns 复用统计
 */
export function measureReuseV5(rules: ShareRule[]): { totalShared: number; totalConsumed: number; avgConsumed: number; reuseRate: number } {
  const totalShared = rules.length;
  const totalConsumed = rules.reduce((s, r) => s + r.consumedCount, 0);
  const avgConsumed = totalShared > 0 ? Math.round((totalConsumed / totalShared) * 10) / 10 : 0;
  const reuseRate = totalShared > 0 ? Math.round((rules.filter((r) => r.consumedCount > 0).length / totalShared) * 1000) / 10 : 0;
  return { totalShared, totalConsumed, avgConsumed, reuseRate };
}

/** 跨角色经验复用报告输出 */
export interface ExperienceShareV5Report {
  byFromRole: Record<string, number>;
  byVisibility: Record<string, number>;
  reuse: { totalShared: number; totalConsumed: number; avgConsumed: number; reuseRate: number };
  suggestions: string[];
}

/**
 * 构建跨角色经验复用报告（纯函数）。
 *
 * @param rules 共享规则
 * @returns 报告
 */
export function buildExperienceShareV5Report(rules: ShareRule[]): ExperienceShareV5Report {
  const byFromRole: Record<string, number> = {};
  const byVisibility: Record<string, number> = {};
  for (const r of rules) {
    byFromRole[r.fromRole] = (byFromRole[r.fromRole] ?? 0) + 1;
    byVisibility[r.visibility] = (byVisibility[r.visibility] ?? 0) + 1;
  }
  const reuse = measureReuseV5(rules);
  return {
    byFromRole,
    byVisibility,
    reuse,
    suggestions: reuse.reuseRate < 50
      ? ["推动未被消费的经验主动推送给目标角色"]
      : ["复用率良好，沉淀为团队SOP"],
  };
}
