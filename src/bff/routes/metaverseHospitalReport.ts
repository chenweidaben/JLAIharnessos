/**
 * 健澜科技 jlmedaios - 元宇宙医院 路由（M237-D）
 *
 * GET /api/v1/metaverse-hospital/report
 *
 * 权限：metaverse-hospital:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildMetaverseHospitalReport } from "../aggregators/metaverseHospitalReportAggregator.js";

export const metaverseHospitalReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/metaverse-hospital/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "metaverse-hospital:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildMetaverseHospitalReport(timeRange);
      return json(ok(result));
    },
  },
];
