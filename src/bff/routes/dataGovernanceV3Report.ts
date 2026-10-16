/**
 * 健澜科技 jlmedaios - 数据治理 V3 路由（M244-B）
 *
 * GET /api/v1/data-governance-v3/report
 *
 * 权限：data-governance-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildDataGovernanceV3Report } from "../aggregators/dataGovernanceV3ReportAggregator.js";

export const dataGovernanceV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/data-governance-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "data-governance-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildDataGovernanceV3Report(timeRange);
      return json(ok(result));
    },
  },
];
