/**
 * 健澜科技 jlmedaios - 安全运营智能化 V2 路由（M235-D）
 *
 * GET /api/v1/security-ops-ai-v2/report
 *
 * 权限：security-ops-ai-v2:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildSecurityOpsIntelligentV2 } from "../aggregators/securityOpsIntelligentV2Aggregator.js";

export const securityOpsIntelligentV2Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/security-ops-ai-v2/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "security-ops-ai-v2:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildSecurityOpsIntelligentV2(timeRange);
      return json(ok(result));
    },
  },
];
