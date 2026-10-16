/**
 * 健澜科技 jlmedaios - 基因与精准医疗 路由（M237-C）
 *
 * GET /api/v1/genomic-precision/report
 *
 * 权限：genomic-precision:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildGenomicPrecisionReport } from "../aggregators/genomicPrecisionReportAggregator.js";

export const genomicPrecisionReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/genomic-precision/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "genomic-precision:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildGenomicPrecisionReport(timeRange);
      return json(ok(result));
    },
  },
];
