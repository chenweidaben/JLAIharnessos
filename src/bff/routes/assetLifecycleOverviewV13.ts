/**
 * 健澜科技 jlmedaios - 经验资产生命周期总览 V13 路由（M305-D）
 *
 * GET /api/v1/asset-lifecycle-overview
 *
 * 权限：asset-lifecycle-overview:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildAssetLifecycleOverviewV13,
  computeAssetHealthV13,
  identifyAssetGapV13,
  type AssetLifecycleInputV13,
} from "../aggregators/assetLifecycleOverviewV13Aggregator.js";

const input: AssetLifecycleInputV13 = {
  activeCount: 80,
  staleCount: 5,
  retiredCount: 10,
  archivedCount: 5,
  highValueActiveCount: 60,
};

export const assetLifecycleOverviewV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/asset-lifecycle-overview",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "asset-lifecycle-overview:read");
      if (denied) return denied;
      const overview = buildAssetLifecycleOverviewV13(input);
      return json(ok({
        ...overview,
        health: computeAssetHealthV13(overview, input),
        gap: identifyAssetGapV13(overview),
      }));
    },
  },
];
