/**
 * 健澜科技 jlmedaios - MUSE 个人经验沉淀闭环 V5 纯函数（M275-A）
 *
 * recordExperienceV5 / scoreExperienceV5 / deduplicateExperienceV5 / buildMUSEExperienceV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 经验记录 */
export interface ExperienceRecord {
  id: string;
  userId: string;
  role: string;
  specialty: string;
  situation: string;
  decision: string;
  outcome: string;
  lesson: string;
  evidenceRef: string;
  upvotes: number;
  downvotes: number;
  status: "draft" | "published" | "archived";
}

/**
 * 记录经验 V5（纯函数）。
 *
 * @param params 经验字段
 * @returns 经验对象
 */
export function recordExperienceV5(params: Omit<ExperienceRecord, "id" | "upvotes" | "downvotes" | "status">): ExperienceRecord {
  return {
    ...params,
    id: `exp-${Date.now()}`,
    upvotes: 0,
    downvotes: 0,
    status: "draft",
  };
}

/**
 * 经验评分 V5（纯函数）。
 *
 * @param upvotes 点赞数
 * @param downvotes 点踩数
 * @returns 质量分
 */
export function scoreExperienceV5(upvotes: number, downvotes: number): number {
  const raw = upvotes - downvotes;
  return Math.max(0, Math.min(100, raw * 10));
}

/**
 * 相似经验去重 V5（纯函数）。
 *
 * @param exps 经验列表
 * @returns 去重后列表
 */
export function deduplicateExperienceV5(exps: ExperienceRecord[]): ExperienceRecord[] {
  const seen = new Set<string>();
  const out: ExperienceRecord[] = [];
  for (const e of exps) {
    const key = `${e.specialty}|${e.situation}|${e.decision}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(e);
    }
  }
  return out;
}

/** MUSE 经验报告输出 */
export interface MUSEExperienceV5Report {
  total: number;
  byRole: Record<string, number>;
  bySpecialty: Record<string, number>;
  avgScore: number;
  topExperiences: ExperienceRecord[];
  suggestions: string[];
}

/**
 * 构建 MUSE 经验报告（纯函数）。
 *
 * @param exps 经验列表
 * @returns 报告
 */
export function buildMUSEExperienceV5Report(exps: ExperienceRecord[]): MUSEExperienceV5Report {
  const byRole: Record<string, number> = {};
  const bySpecialty: Record<string, number> = {};
  let scoreSum = 0;
  for (const e of exps) {
    byRole[e.role] = (byRole[e.role] ?? 0) + 1;
    bySpecialty[e.specialty] = (bySpecialty[e.specialty] ?? 0) + 1;
    scoreSum += scoreExperienceV5(e.upvotes, e.downvotes);
  }
  const avgScore = exps.length > 0 ? Math.round(scoreSum / exps.length) : 0;
  const topExperiences = [...exps]
    .sort((a, b) => scoreExperienceV5(b.upvotes, b.downvotes) - scoreExperienceV5(a.upvotes, a.downvotes))
    .slice(0, 5);
  return {
    total: exps.length,
    byRole,
    bySpecialty,
    avgScore,
    topExperiences,
    suggestions: exps.length < 10
      ? ["鼓励更多医生护士沉淀临床决策经验"]
      : ["推广高分经验，推动跨角色复用"],
  };
}
