/**
 * 健澜科技 jlmedaios - 党建 V3 路由（M245-A）
 *
 * GET /api/v1/party-building-v3/report
 *
 * 权限：party-building-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildPartyBuildingV3Report } from "../aggregators/partyBuildingV3ReportAggregator.js";

export const partyBuildingV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/party-building-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "party-building-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildPartyBuildingV3Report(timeRange);
      return json(ok(result));
    },
  },
];
