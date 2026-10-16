/**
 * 健澜科技 jlmedaios - 病历质量 V3 路由（M256-C 里程碑 v5.00.0）
 *
 * GET /api/v1/record-quality-v3/report
 *
 * 权限：record-quality-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildRecordQualityV3Report } from "../aggregators/recordQualityV3ReportAggregator.js";

export const recordQualityV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/record-quality-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "record-quality-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildRecordQualityV3Report(timeRange);
      return json(ok(result));
    },
  },
];
