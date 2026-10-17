/**
 * 健澜科技 jlmedaios - Agent 反馈与经验沉淀 V8 路由（M291-A）
 *
 * POST /api/v1/agent/feedback 记录反馈
 * GET  /api/v1/agent/learning-summary 学习摘要（query: role）
 *
 * 权限：agent-feedback:write / agent-feedback:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAgentLearningSummaryV8,
  recordAgentFeedbackV8,
  type AgentFeedbackEvent,
} from "../aggregators/agentLearningV8Aggregator.js";

const historyStore: AgentFeedbackEvent[] = [
  { role: "doctor", eventType: "adopt", createdAt: 1 },
  { role: "doctor", eventType: "adopt", createdAt: 2 },
  { role: "doctor", eventType: "correct", createdAt: 3 },
  { role: "doctor", eventType: "reject", createdAt: 4 },
];

export const agentLearningV8Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/agent/feedback",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "agent-feedback:write");
      if (denied) return denied;

      const body = await c.req.json() as AgentFeedbackEvent;
      const next = recordAgentFeedbackV8(body, historyStore);
      historyStore.length = 0;
      historyStore.push(...next);
      return json(ok({
        recorded: true,
        total: historyStore.length,
      }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/agent/learning-summary",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "agent-feedback:read");
      if (denied) return denied;

      const url = new URL(c.req.url);
      const role = url.searchParams.get("role") ?? "doctor";
      const scoped = historyStore.filter((h) => h.role === role);
      return json(ok({
        role,
        ...buildAgentLearningSummaryV8(scoped),
      }));
    },
  },
];
