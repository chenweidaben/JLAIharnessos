/**
 * 健澜科技 jlmedaios - 影像 AI V4 路由（M248-B）
 *
 * GET /api/v1/imaging-ai-v4/report
 *
 * 权限：imaging-ai-v4:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildImagingAIV4Report } from "../aggregators/imagingAIV4ReportAggregator.js";

export const imagingAIV4ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/imaging-ai-v4/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "imaging-ai-v4:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildImagingAIV4Report(timeRange);
      return json(ok(result));
    },
  },
];
