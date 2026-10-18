/**
 * 健澜科技 jlmedaios - 固定资产质量管理 V13 路由（M435-C，-quality 后缀避让旧版固定资产模块（M408 medicalDeviceMgmtV13 等））
 *
 * GET /api/v1/fixed-asset-quality-mgmt
 *
 * 权限：fixed-asset-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeFixedAssetCompletenessRateV13,
  computeFixedAssetInventoryAccuracyRateV13,
  computeFixedAssetUtilizationRateV13,
  type FixedAssetQualityMgmtRecordV13,
} from "../aggregators/fixedAssetQualityMgmtV13Aggregator.js";

const records: FixedAssetQualityMgmtRecordV13[] = [
  { actualUsageHours: 900, shouldUsageHours: 1000, intactAssets: 980, totalAssets: 1000, matchedAssets: 950, totalInventoryAssets: 1000 },
  { actualUsageHours: 900, shouldUsageHours: 1000, intactAssets: 980, totalAssets: 1000, matchedAssets: 950, totalInventoryAssets: 1000 },
];

export const fixedAssetQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/fixed-asset-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "fixed-asset-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        fixedAssetUtilizationRate: computeFixedAssetUtilizationRateV13(records),
        fixedAssetCompletenessRate: computeFixedAssetCompletenessRateV13(records),
        fixedAssetInventoryAccuracyRate: computeFixedAssetInventoryAccuracyRateV13(records),
      }));
    },
  },
];
