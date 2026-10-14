/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * MEDMUSE Agent 健康度看板 API（GET /api/v1/medmuse/agent-health，仅登录鉴权）
 */
import { get } from '../request';

export type AgentStatus = 'healthy' | 'warning' | 'critical';

/** 看板中单个 agent 的一行（与 BFF agents/agentMetrics.ts 对齐） */
export interface AgentHealthRow {
  agent: string;
  calls: number;
  failures: number;
  avgDurationMs: number;
  /** 失败率 0~1 */
  failureRate: number;
  /** 熔断状态：true=已熔断 */
  circuitOpen: boolean;
  status: AgentStatus;
}

/** 健康度看板整体返回 */
export interface AgentHealthBoard {
  overall: AgentStatus;
  generatedAt: string;
  totals: { calls: number; failures: number; avgDurationMs: number };
  agents: AgentHealthRow[];
}

/** 拉取 MEDMUSE Agent 健康度看板 */
export function fetchAgentHealthBoard(): Promise<AgentHealthBoard> {
  return get<AgentHealthBoard>('/medmuse/agent-health');
}
