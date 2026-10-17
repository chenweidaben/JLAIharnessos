/**
 * 健澜科技 jlmedaios - 数据治理成熟度 V13 路由（M323-D）
 *
 * GET /api/v1/data-governance-maturity
 *
 * 权限：data-governance-maturity:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  assessDataQualityMaturityV13,
  assessDataSecurityMaturityV13,
  assessMasterDataMaturityV13,
  assessMetadataMaturityV13,
  MATURITY_LABEL_V13,
  type DataGovernanceItemV13,
} from "../aggregators/dataGovernanceV13Aggregator.js";

const items: DataGovernanceItemV13[] = [
  { dimension: "masterData", level: 3 },
  { dimension: "masterData", level: 3 },
  { dimension: "masterData", level: 3 },
  { dimension: "metadata", level: 3 },
  { dimension: "metadata", level: 3 },
  { dimension: "metadata", level: 3 },
  { dimension: "dataQuality", level: 2 },
  { dimension: "dataQuality", level: 2 },
  { dimension: "dataQuality", level: 2 },
  { dimension: "dataSecurity", level: 4 },
  { dimension: "dataSecurity", level: 4 },
  { dimension: "dataSecurity", level: 4 },
];

export const dataGovernanceV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/data-governance-maturity",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "data-governance-maturity:read");
      if (denied) return denied;
      const masterLevel = assessMasterDataMaturityV13(items);
      const metaLevel = assessMetadataMaturityV13(items);
      const qualityLevel = assessDataQualityMaturityV13(items);
      const securityLevel = assessDataSecurityMaturityV13(items);
      return json(ok({
        masterData: { level: masterLevel, label: MATURITY_LABEL_V13[masterLevel] },
        metadata: { level: metaLevel, label: MATURITY_LABEL_V13[metaLevel] },
        dataQuality: { level: qualityLevel, label: MATURITY_LABEL_V13[qualityLevel] },
        dataSecurity: { level: securityLevel, label: MATURITY_LABEL_V13[securityLevel] },
      }));
    },
  },
];
