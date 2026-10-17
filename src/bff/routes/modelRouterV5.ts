/**
 * 健澜科技 jlmedaios - 多模型路由与降级 V5 路由（M280-A）
 *
 * GET  /api/v1/model-router（模型路由看板）
 * POST /api/v1/model-router/override（手动覆盖）
 * GET  /api/v1/model-router/cost（成本/时延统计）
 *
 * 权限：model-router:read / model-router:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildModelRouterV5Report,
  estimateCostV5,
  routeModelV5,
  type ProviderConfig,
} from "../aggregators/modelRouterV5Aggregator.js";

const providers: ProviderConfig[] = [
  { name: "medical-70b", available: true, latencyP95: 1200, errorRate: 0.01, costPer1kTokens: 0.08 },
  { name: "mid-13b", available: true, latencyP95: 400, errorRate: 0.005, costPer1kTokens: 0.02 },
  { name: "general-7b", available: true, latencyP95: 150, errorRate: 0.002, costPer1kTokens: 0.01 },
];

const calls = [
  { model: "medical-70b", tokens: 2000, usedFallback: false },
  { model: "mid-13b", tokens: 1500, usedFallback: false },
  { model: "general-7b", tokens: 500, usedFallback: true },
];

export const modelRouterV5Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/model-router",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "model-router:read");
      if (denied) return denied;

      return json(ok(buildModelRouterV5Report(providers, calls)));
    },
  },
  {
    method: "POST",
    path: "/api/v1/model-router/override",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "model-router:write");
      if (denied) return denied;

      const body = await c.req.json() as { prompt: string; highRisk: boolean; longContext: boolean; forcedModel?: string };
      const decision = routeModelV5(body.prompt, { highRisk: body.highRisk, longContext: body.longContext });
      if (body.forcedModel) {
        decision.primary = body.forcedModel;
        decision.reason = "手动覆盖";
      }
      return json(ok(decision));
    },
  },
  {
    method: "GET",
    path: "/api/v1/model-router/cost",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "model-router:read");
      if (denied) return denied;

      const tokens = Number(c.query.get("tokens") ?? "1000");
      const model = c.query.get("model") ?? "general-7b";
      return json(ok({ model, tokens, cost: estimateCostV5(tokens, model) }));
    },
  },
];
