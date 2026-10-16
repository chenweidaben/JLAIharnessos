/**
 * 健澜科技 jlmedaios - 隐私计算与数据要素流通 V5 路由（M261-B）
 *
 * GET /api/v1/privacy-compute-v5/report
 *
 * 权限：privacy-compute-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildPrivacyComputeV5Report } from "../aggregators/privacyComputeV5ReportAggregator.js";

export const privacyComputeV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/privacy-compute-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "privacy-compute-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildPrivacyComputeV5Report(timeRange);
      return json(ok(result));
    },
  },
];
