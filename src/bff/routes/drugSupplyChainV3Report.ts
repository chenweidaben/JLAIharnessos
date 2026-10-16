/**
 * 健澜科技 jlmedaios - 药品供应链 V3 路由（M256-D）
 *
 * GET /api/v1/drug-supply-chain-v3/report
 *
 * 权限：drug-supply-chain-v3:report:view。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildDrugSupplyChainV3Report } from "../aggregators/drugSupplyChainV3ReportAggregator.js";

export const drugSupplyChainV3ReportRoutes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/drug-supply-chain-v3/report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "drug-supply-chain-v3:report:view");
      if (denied) return denied;

      const timeRange = c.query.get("timeRange") ?? "30d";
      const result = buildDrugSupplyChainV3Report(timeRange);
      return json(ok(result));
    },
  },
];
