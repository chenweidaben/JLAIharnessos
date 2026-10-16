/**
 * 健澜科技 jlmedaios - 住院一站式服务 V5 路由（M270-B）
 *
 * GET /api/v1/inpatient-onestop-v5/report
 *
 * 权限：inpatient-onestop-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildInpatientOneStopV5Report } from "../aggregators/inpatientOneStopV5ReportAggregator.js";

export const inpatientOneStopV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/inpatient-onestop-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "inpatient-onestop-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildInpatientOneStopV5Report(timeRange);
      return json(ok(result));
    },
  },
];
