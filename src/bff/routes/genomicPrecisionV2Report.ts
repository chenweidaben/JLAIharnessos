/**
 * 健澜科技 jlmedaios - 基因精准 V2 路由（M247-C）
 *
 * GET /api/v1/genomic-precision-v2/report
 *
 * 权限：genomic-precision-v2:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildGenomicPrecisionV2Report } from "../aggregators/genomicPrecisionV2ReportAggregator.js";

export const genomicPrecisionV2ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/genomic-precision-v2/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "genomic-precision-v2:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildGenomicPrecisionV2Report(timeRange);
      return json(ok(result));
    },
  },
];
