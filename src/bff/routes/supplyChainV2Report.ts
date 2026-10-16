/**
 * 健澜科技 jlmedaios - 供应链 V2 路由（M236-B）
 *
 * GET /api/v1/supply-chain-v2/report
 *
 * 权限：supply-chain-v2:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildSupplyChainV2Report } from "../aggregators/supplyChainV2ReportAggregator.js";

export const supplyChainV2ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/supply-chain-v2/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "supply-chain-v2:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildSupplyChainV2Report(timeRange);
      return json(ok(result));
    },
  },
];
