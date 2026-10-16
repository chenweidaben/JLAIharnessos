/**
 * 健澜科技 jlmedaios - 皮肤与感染性疾病 V5 路由（M266-C）
 *
 * GET /api/v1/derm-infectious-v5/report
 *
 * 权限：derm-infectious-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildDermInfectiousV5Report } from "../aggregators/dermInfectiousV5ReportAggregator.js";

export const dermInfectiousV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/derm-infectious-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "derm-infectious-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildDermInfectiousV5Report(timeRange);
      return json(ok(result));
    },
  },
];
