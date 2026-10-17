/**
 * 健澜科技 jlmedaios - 收入结构 V13 路由（M329-C）
 *
 * GET /api/v1/revenue-structure
 *
 * 权限：revenue-structure:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeRevenueShareV13,
  computeTotalRevenueV13,
  type RevenueCategoryV13,
} from "../aggregators/revenueStructureV13Aggregator.js";

const revenue: RevenueCategoryV13[] = [
  { category: "医疗", amount: 600 },
  { category: "药品", amount: 300 },
  { category: "检查", amount: 400 },
  { category: "化验", amount: 200 },
];

export const revenueStructureV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/revenue-structure",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "revenue-structure:read");
      if (denied) return denied;
      return json(ok({
        total: computeTotalRevenueV13(revenue),
        share: computeRevenueShareV13(revenue),
      }));
    },
  },
];
