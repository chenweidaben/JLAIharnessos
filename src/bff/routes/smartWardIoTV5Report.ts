/**
 * 健澜科技 jlmedaios - 智慧病房 IoT V5 路由（M268-A）
 *
 * GET /api/v1/smart-ward-iot-v5/report
 *
 * 权限：smart-ward-iot-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildSmartWardIoTV5Report } from "../aggregators/smartWardIoTV5ReportAggregator.js";

export const smartWardIoTV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/smart-ward-iot-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "smart-ward-iot-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildSmartWardIoTV5Report(timeRange);
      return json(ok(result));
    },
  },
];
