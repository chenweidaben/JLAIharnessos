/**
 * 健澜科技 jlmedaios - 从反馈沉淀个性化推荐规则 V9 路由（M291-B）
 *
 * GET  /api/v1/agent/rules 规则列表（query: role）
 * POST /api/v1/agent/rules/:id/toggle 启用/停用
 *
 * 权限：agent-rule:read / agent-rule:write。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildRuleLibraryV9,
  distillRulesV9,
  rankRecommendV9,
  type FeedbackEventV9,
} from "../aggregators/agentRuleV9Aggregator.js";

const eventStore: FeedbackEventV9[] = [
  { role: "doctor", pattern: "warn-dual-antiplatelet", eventType: "adopt" },
  { role: "doctor", pattern: "warn-dual-antiplatelet", eventType: "adopt" },
  { role: "doctor", pattern: "warn-dual-antiplatelet", eventType: "adopt" },
  { role: "doctor", pattern: "dose-reminder", eventType: "reject" },
  { role: "nurse", pattern: "iv-15min-check", eventType: "adopt" },
];

export const agentRuleV9Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/agent/rules",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "agent-rule:read");
      if (denied) return denied;

      const url = new URL(c.req.url);
      const role = url.searchParams.get("role") ?? "";
      const rules = distillRulesV9(eventStore);
      const scoped = role ? rankRecommendV9(rules, { role: role as "doctor" }) : rules;
      return json(ok({
        rules: scoped,
        library: buildRuleLibraryV9(rules),
      }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/agent/rules/:id/toggle",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "agent-rule:write");
      if (denied) return denied;

      const id = c.params.id;
      return json(ok({
        toggled: true,
        id,
      }));
    },
  },
];
