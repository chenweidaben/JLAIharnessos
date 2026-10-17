/**
 * 健澜科技 jlmedaios - 数据治理明细 V13 路由（M401-B，避让旧版 dataGovernanceV13/dataGovernanceStatsV13）
 *
 * GET /api/v1/data-governance-detail
 *
 * 权限：data-governance-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDataQualityScoreV13,
  computeDataStandardAdoptionRateV13,
  computeMasterDataConsistencyRateV13,
  type DataGovernanceDetailRecordV13,
} from "../aggregators/dataGovernanceDetailV13Aggregator.js";

const records: DataGovernanceDetailRecordV13[] = [
  { qualityScore: 90, consistent: 950, totalChecked: 1000, adopted: 800, totalStandards: 1000 },
  { qualityScore: 90, consistent: 950, totalChecked: 1000, adopted: 800, totalStandards: 1000 },
];

export const dataGovernanceDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/data-governance-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "data-governance-detail:read");
      if (denied) return denied;
      return json(ok({
        dataQualityScore: computeDataQualityScoreV13(records),
        masterDataConsistencyRate: computeMasterDataConsistencyRateV13(records),
        dataStandardAdoptionRate: computeDataStandardAdoptionRateV13(records),
      }));
    },
  },
];
