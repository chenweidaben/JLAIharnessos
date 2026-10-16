/**
 * 健澜科技 jlmedaios - 运营决策智能化 V2 路由（M233-C）
 *
 * GET /api/v1/operations-ai-v2/report
 *
 * 权限：operations-ai-v2:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildOperationsIntelligentV2 } from "../aggregators/operationsIntelligentV2Aggregator.js";

export const operationsIntelligentV2Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/operations-ai-v2/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "operations-ai-v2:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildOperationsIntelligentV2(timeRange);
      return json(ok(result));
    },
  },
];
