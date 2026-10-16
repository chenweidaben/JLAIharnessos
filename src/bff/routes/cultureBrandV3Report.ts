/**
 * 健澜科技 jlmedaios - 文化品牌 V3 路由（M245-B）
 *
 * GET /api/v1/culture-brand-v3/report
 *
 * 权限：culture-brand-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildCultureBrandV3Report } from "../aggregators/cultureBrandV3ReportAggregator.js";

export const cultureBrandV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/culture-brand-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "culture-brand-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildCultureBrandV3Report(timeRange);
      return json(ok(result));
    },
  },
];
