/**
 * 健澜科技 jlmedaios - 影像 AI V3 路由（M238-B）
 *
 * GET /api/v1/imaging-ai-v3/report
 *
 * 权限：imaging-ai-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildImagingAIV3Report } from "../aggregators/imagingAIV3ReportAggregator.js";

export const imagingAIV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/imaging-ai-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "imaging-ai-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildImagingAIV3Report(timeRange);
      return json(ok(result));
    },
  },
];
