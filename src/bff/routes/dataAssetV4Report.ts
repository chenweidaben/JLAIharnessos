/**
 * 健澜科技 jlmedaios - 数据资产 V4 路由（M253-D）
 *
 * GET /api/v1/data-asset-v4/report
 *
 * 权限：data-asset-v4:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildDataAssetV4Report } from "../aggregators/dataAssetV4ReportAggregator.js";

export const dataAssetV4ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/data-asset-v4/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "data-asset-v4:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildDataAssetV4Report(timeRange);
      return json(ok(result));
    },
  },
];
