/**
 * 健澜科技 jlmedaios - 数据中台智能化 V2 路由（M235-C）
 *
 * GET /api/v1/data-platform-ai-v2/report
 *
 * 权限：data-platform-ai-v2:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildDataPlatformIntelligentV2 } from "../aggregators/dataPlatformIntelligentV2Aggregator.js";

export const dataPlatformIntelligentV2Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/data-platform-ai-v2/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "data-platform-ai-v2:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildDataPlatformIntelligentV2(timeRange);
      return json(ok(result));
    },
  },
];
