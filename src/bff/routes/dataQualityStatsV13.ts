/**
 * 健澜科技 jlmedaios - 数据质量 V13 路由（M353-B，stats 避让已有 dataQualityV13）
 *
 * GET /api/v1/data-quality-stats
 *
 * 权限：data-quality-stats:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAccuracyRateV13,
  computeIntegrityRateV13,
  computeMasterDataConsistencyRateV13,
  type DataQualityStatsRecordV13,
} from "../aggregators/dataQualityStatsV13Aggregator.js";

const records: DataQualityStatsRecordV13[] = [
  { integrityPassedCount: 98, integrityCheckedCount: 100, accuracyPassedCount: 99, accuracyCheckedCount: 100, masterConsistentCount: 99, masterComparedCount: 100 },
  { integrityPassedCount: 97, integrityCheckedCount: 100, accuracyPassedCount: 98, accuracyCheckedCount: 100, masterConsistentCount: 99, masterComparedCount: 100 },
];

export const dataQualityStatsV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/data-quality-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "data-quality-stats:read");
      if (denied) return denied;
      return json(ok({
        integrityRate: computeIntegrityRateV13(records),
        accuracyRate: computeAccuracyRateV13(records),
        masterDataConsistencyRate: computeMasterDataConsistencyRateV13(records),
      }));
    },
  },
];
