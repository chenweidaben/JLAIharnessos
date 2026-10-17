/**
 * 健澜科技 jlmedaios - 数据治理 V13（统计）路由（M363-D，stats避让）
 *
 * GET /api/v1/data-governance-stats
 *
 * 权限：data-governance-stats:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDataQualityPassRateV13,
  computeDataStandardCoverageRateV13,
  computeMetadataManagementRateV13,
  type DataGovernanceStatsRecordV13,
} from "../aggregators/dataGovernanceStatsV13Aggregator.js";

const records: DataGovernanceStatsRecordV13[] = [
  { qualityPassed: 950, qualityChecked: 1000, standardCovered: 480, standardTotal: 500, metadataManaged: 95, metadataRequired: 100 },
  { qualityPassed: 950, qualityChecked: 1000, standardCovered: 470, standardTotal: 500, metadataManaged: 95, metadataRequired: 100 },
];

export const dataGovernanceStatsV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/data-governance-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "data-governance-stats:read");
      if (denied) return denied;
      return json(ok({
        qualityPassRate: computeDataQualityPassRateV13(records),
        standardCoverageRate: computeDataStandardCoverageRateV13(records),
        metadataManagementRate: computeMetadataManagementRateV13(records),
      }));
    },
  },
];
