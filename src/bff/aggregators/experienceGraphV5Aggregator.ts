/**
 * 健澜科技 jlmedaios - 经验图谱与后继者继承 V5 纯函数（M275-D）
 *
 * buildExperienceGraphV5 / onboardInheritorV5 / rankMustKnowV5 / buildExperienceGraphV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 经验图谱节点 */
export interface GraphNode {
  nodeId: string;
  entityType: "specialty" | "situation" | "experience";
  entityName: string;
}

/** 经验图谱边 */
export interface GraphEdge {
  edgeType: string;
  sourceId: string;
  targetId: string;
  weight: number;
}

/** 后继者入职包 */
export interface InheritorOnboarding {
  userId: string;
  onboardingPath: string[];
  coveredExperiences: number;
  totalExperiences: number;
  completionPct: number;
}

/**
 * 构建经验图谱 V5（纯函数）。
 *
 * @param exps 经验列表（id/specialty/situation）
 * @returns 节点与边
 */
export function buildExperienceGraphV5(exps: { id: string; specialty: string; situation: string }[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const seenSpecialty = new Set<string>();
  const seenSituation = new Set<string>();
  for (const e of exps) {
    if (!seenSpecialty.has(e.specialty)) {
      seenSpecialty.add(e.specialty);
      nodes.push({ nodeId: `spec-${e.specialty}`, entityType: "specialty", entityName: e.specialty });
    }
    const situationKey = `${e.specialty}-${e.situation}`;
    if (!seenSituation.has(situationKey)) {
      seenSituation.add(situationKey);
      nodes.push({ nodeId: `sit-${situationKey}`, entityType: "situation", entityName: e.situation });
      edges.push({ edgeType: "has-situation", sourceId: `spec-${e.specialty}`, targetId: `sit-${situationKey}`, weight: 1 });
    }
    nodes.push({ nodeId: e.id, entityType: "experience", entityName: e.situation });
    edges.push({ edgeType: "covers", sourceId: `sit-${situationKey}`, targetId: e.id, weight: 1 });
  }
  return { nodes, edges };
}

/**
 * 新人入职必读路径 V5（纯函数）。
 *
 * @param newUser 新人ID
 * @param team 团队经验列表
 * @returns 入职包
 */
export function onboardInheritorV5(newUser: string, team: { id: string; specialty: string; situation: string; upvotes: number }[]): InheritorOnboarding {
  const mustKnow = rankMustKnowV5(team);
  const onboardingPath = mustKnow.map((e) => `${e.specialty}·${e.situation}`);
  const totalExperiences = team.length;
  const coveredExperiences = mustKnow.length;
  const completionPct = totalExperiences > 0 ? Math.round((coveredExperiences / totalExperiences) * 100) : 0;
  return {
    userId: newUser,
    onboardingPath,
    coveredExperiences,
    totalExperiences,
    completionPct,
  };
}

/**
 * 必读经验排序 V5（纯函数）：按 upvotes 降序取前 5 条。
 *
 * @param exps 经验列表
 * @returns 必读列表
 */
export function rankMustKnowV5(exps: { id: string; specialty: string; situation: string; upvotes: number }[]): { id: string; specialty: string; situation: string; upvotes: number }[] {
  return [...exps].sort((a, b) => b.upvotes - a.upvotes).slice(0, 5);
}

/** 经验图谱报告输出 */
export interface ExperienceGraphV5Report {
  nodeCount: number;
  edgeCount: number;
  specialtyCount: number;
  inheritorCount: number;
  avgCompletionPct: number;
  suggestions: string[];
}

/**
 * 构建经验图谱报告（纯函数）。
 *
 * @param nodes 节点
 * @param edges 边
 * @param inheritors 入职包列表
 * @returns 报告
 */
export function buildExperienceGraphV5Report(
  nodes: GraphNode[],
  edges: GraphEdge[],
  inheritors: InheritorOnboarding[],
): ExperienceGraphV5Report {
  const specialtyCount = nodes.filter((n) => n.entityType === "specialty").length;
  const avgCompletionPct = inheritors.length > 0
    ? Math.round(inheritors.reduce((s, i) => s + i.completionPct, 0) / inheritors.length)
    : 0;
  return {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    specialtyCount,
    inheritorCount: inheritors.length,
    avgCompletionPct,
    suggestions: avgCompletionPct < 50
      ? ["推动新人完成必读经验路径学习"]
      : ["经验传承覆盖良好，持续沉淀"],
  };
}
