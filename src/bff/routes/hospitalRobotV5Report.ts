/**
 * 健澜科技 jlmedaios - 医院机器人与自动化 V5 路由（M268-B）
 *
 * GET /api/v1/hospital-robot-v5/report
 *
 * 权限：hospital-robot-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildHospitalRobotV5Report } from "../aggregators/hospitalRobotV5ReportAggregator.js";

export const hospitalRobotV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/hospital-robot-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "hospital-robot-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildHospitalRobotV5Report(timeRange);
      return json(ok(result));
    },
  },
];
