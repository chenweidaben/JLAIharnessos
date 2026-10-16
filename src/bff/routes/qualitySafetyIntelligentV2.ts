/**
 * 健澜科技 jlmedaios - 质量安全智能化 V2 路由（M233-D）
 *
 * GET /api/v1/quality-safety-ai-v2/report
 *
 * 权限：quality-safety-ai-v2:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildQualitySafetyIntelligentV2 } from "../aggregators/qualitySafetyIntelligentV2Aggregator.js";

export const qualitySafetyIntelligentV2Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/quality-safety-ai-v2/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "quality-safety-ai-v2:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildQualitySafetyIntelligentV2(timeRange);
      return json(ok(result));
    },
  },
];
