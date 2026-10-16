/**
 * 健澜科技 jlmedaios - 云原生 SRE 深化 V5 路由（M260-C）
 *
 * GET /api/v1/cloud-native-sre-v5/report
 *
 * 权限：cloud-native-sre-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildCloudNativeSREV5Report } from "../aggregators/cloudNativeSREV5ReportAggregator.js";

export const cloudNativeSREV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/cloud-native-sre-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "cloud-native-sre-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildCloudNativeSREV5Report(timeRange);
      return json(ok(result));
    },
  },
];
