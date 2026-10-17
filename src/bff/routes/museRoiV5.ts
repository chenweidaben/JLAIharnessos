/**
 * 健澜科技 jlmedaios - MUSE 成本与 ROI 分析 V5 路由（M285-D）
 *
 * GET /api/v1/muse-roi（成本看板）
 * GET /api/v1/muse-roi/suggest（模型组合建议）
 *
 * 权限：muse-roi:read / muse-roi:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildMuseROIV5Report,
  estimateROIV5,
  optimizeModelMixV5,
  type CostEntry,
} from "../aggregators/museRoiV5Aggregator.js";

const costStore: CostEntry[] = [
  { model: "gpt-4", tokenIn: 100000, tokenOut: 50000, costCny: 6.0, savedValueCny: 60 },
  { model: "deepseek", tokenIn: 200000, tokenOut: 100000, costCny: 0.4, savedValueCny: 40 },
];

export const museRoiV5Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/muse-roi",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-roi:read");
      if (denied) return denied;

      return json(ok(buildMuseROIV5Report(costStore, 1000)));
    },
  },
  {
    method: "GET",
    path: "/api/v1/muse-roi/suggest",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-roi:read");
      if (denied) return denied;

      const totalCost = costStore.reduce((s, e) => s + e.costCny, 0);
      const totalSaved = costStore.reduce((s, e) => s + e.savedValueCny, 0);
      return json(ok({
        ...optimizeModelMixV5(costStore),
        overallROI: estimateROIV5(totalCost, totalSaved),
      }));
    },
  },
];
