/**
 * 健澜科技 jlmedaios - 门诊住院 V4 路由（M252-D）
 *
 * GET /api/v1/outpatient-inpatient-v4/report
 *
 * 权限：outpatient-inpatient-v4:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildOutpatientInpatientV4Report } from "../aggregators/outpatientInpatientV4ReportAggregator.js";

export const outpatientInpatientV4ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/outpatient-inpatient-v4/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "outpatient-inpatient-v4:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildOutpatientInpatientV4Report(timeRange);
      return json(ok(result));
    },
  },
];
