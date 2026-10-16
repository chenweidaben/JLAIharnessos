/**
 * 健澜科技 jlmedaios - 内分泌代谢疾病管理 V5 路由（M264-D）
 *
 * GET /api/v1/endocrinology-v5/report
 *
 * 权限：endocrinology-v5:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildEndocrinologyV5Report } from "../aggregators/endocrinologyV5ReportAggregator.js";

export const endocrinologyV5ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/endocrinology-v5/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "endocrinology-v5:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildEndocrinologyV5Report(timeRange);
      return json(ok(result));
    },
  },
];
