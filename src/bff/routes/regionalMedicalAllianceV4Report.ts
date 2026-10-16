/**
 * 健澜科技 jlmedaios - 区域医联体 V4 路由（M253-C）
 *
 * GET /api/v1/regional-alliance-v4/report
 *
 * 权限：regional-alliance-v4:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildRegionalMedicalAllianceV4Report } from "../aggregators/regionalMedicalAllianceV4ReportAggregator.js";

export const regionalMedicalAllianceV4ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/regional-alliance-v4/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "regional-alliance-v4:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildRegionalMedicalAllianceV4Report(timeRange);
      return json(ok(result));
    },
  },
];
