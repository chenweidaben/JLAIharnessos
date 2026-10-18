/**
 * 健澜科技 jlmedaios - 质控数据导出区域上报 V14 路由（M497-D，M497 收官）
 *
 * POST /api/v1/emr-qc-export-region  （auth:true，body 用 await c.req.json()）区域上报提交
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildRegionReport, validateRegionFormat } from "../aggregators/emrQcExportRegionV14Aggregator.js";

export const emrQcExportRegionV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-qc-export-region",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-export-region:write");
      if (denied) return denied;
      const body = await c.req.json() as {
        region?: string;
        period?: string;
        metrics?: Record<string, number>;
      };
      const report = buildRegionReport(
        body.region ?? "",
        body.period ?? "",
        body.metrics ?? {},
      );
      const validation = validateRegionFormat(report);
      return json(ok({ report, validation }));
    },
  },
];
