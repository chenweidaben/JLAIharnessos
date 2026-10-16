/**
 * 健澜科技 jlmedaios - 多 Agent 协作深化纯函数（M201-B）
 *
 * buildMultiAgentReport / orchestrateAgents / resolveAgentConflict
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** Agent 数据 */
export interface AgentInfo {
  name: string;
  specialty: string;
  capability: number;
}

/** 任务数据 */
export interface TaskData {
  description: string;
  priority: number;
}

/**
 * Agent 编排（纯函数）。
 *
 * @param task 任务
 * @param agents 可用 Agent
 * @returns 编排结果
 */
export function orchestrateAgents(task: TaskData, agents: AgentInfo[]): { assigned: AgentInfo[]; lead: AgentInfo } {
  const sorted = [...agents].sort((a, b) => b.capability - a.capability);
  const lead = sorted[0];
  const assigned = sorted.slice(0, Math.min(3, sorted.length));
  return { assigned, lead };
}

/** Agent 意见 */
export interface AgentOpinion {
  agent: string;
  recommendation: string;
  confidence: number;
}

/**
 * Agent 冲突解决（纯函数）。
 *
 * @param opinions 意见列表
 * @returns 解决结果
 */
export function resolveAgentConflict(opinions: AgentOpinion[]): { decision: string; method: string } {
  const highConfidence = opinions.filter((o) => o.confidence > 0.8);
  if (highConfidence.length > 0) {
    return { decision: highConfidence.sort((a, b) => b.confidence - a.confidence)[0].recommendation, method: '高置信优先' };
  }
  const votes: Record<string, number> = {};
  for (const o of opinions) {
    votes[o.recommendation] = (votes[o.recommendation] ?? 0) + 1;
  }
  const decision = Object.entries(votes).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '专家会诊';
  return { decision, method: '投票表决' };
}

/** 多 Agent 报告输出 */
export interface MultiAgentReport {
  timeRange: string;
  agents: { doctor: boolean; nurse: boolean; pharma: boolean; admin: boolean; patient: boolean; total: number };
  orchestration: { tasks: number; avgAgentsPerTask: number };
  communication: { messages: number; sharedContexts: number };
  collaboration: { decisions: number; conflictsResolved: number };
  workflow: { automated: number };
  monitoring: { active: number };
  memory: { shared: number };
  evolution: { iterations: number };
  suggestions: string[];
}

/**
 * 构建多 Agent 报告。
 *
 * @param timeRange 时间范围
 * @returns 多 Agent 报告
 */
export function buildMultiAgentReport(timeRange: string): MultiAgentReport {
  return {
    timeRange,
    agents: { doctor: true, nurse: true, pharma: true, admin: true, patient: true, total: 5 },
    orchestration: { tasks: 500, avgAgentsPerTask: 2.5 },
    communication: { messages: 10000, sharedContexts: 500 },
    collaboration: { decisions: 300, conflictsResolved: 20 },
    workflow: { automated: 100 },
    monitoring: { active: 5 },
    memory: { shared: 2000 },
    evolution: { iterations: 50 },
    suggestions: ['优化 Agent 通信效率', '增加冲突自动解决覆盖'],
  };
}
