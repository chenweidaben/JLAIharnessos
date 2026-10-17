/**
 * 健澜科技 jlmedaios - 智能体健康度评分 V12 路由（M294-C）
 *
 * GET /api/v1/agent-health 健康度看板
 *
 * 权限：agent-health:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildHealthDashboardV12,
  scoreAgentHealthV12,
  type AgentHealthInputV12,
} from "../aggregators/agentHealthV12Aggregator.js";

const inputs: AgentHealthInputV12[] = [
  { role: "doctor", adoptRate: 80, retrainDone: 5, retrainTotal: 5 },
  { role: "nurse", adoptRate: 70, retrainDone: 3, retrainTotal: 5 },
  { role: "pharma", adoptRate: 50, retrainDone: 1, retrainTotal: 4 },
  { role: "manager", adoptRate: 85, retrainDone: 4, retrainTotal: 4 },
  { role: "muse", adoptRate: 60, retrainDone: 2, retrainTotal: 4 },
];

export const agentHealthV12Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/agent-health",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "agent-health:read");
      if (denied) return denied;
      const scores = inputs.map((i) => scoreAgentHealthV12(i.role, { adoptRate: i.adoptRate }, i.retrainDone, i.retrainTotal));
      return json(ok(buildHealthDashboardV12(scores)));
    },
  },
];
