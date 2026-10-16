/**
 * 健澜科技 jlmedaios - 生物样本库与科研数据 V5 路由（M269-C）
 *
 * GET /api/v1/biobank-v5/report
 *
 * 权限：biobank-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildBiobankV5Report } from "../aggregators/biobankV5ReportAggregator.js";

export const biobankV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/biobank-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "biobank-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildBiobankV5Report(timeRange);
      return json(ok(result));
    },
  },
];
