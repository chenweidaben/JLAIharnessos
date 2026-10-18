/**
 * 健澜科技 jlmedaios - 污水处理质量管理 V13 路由（M436-A，院感安全环保质量管理深化组）
 *
 * GET /api/v1/sewage-treatment-quality-mgmt
 *
 * 权限：sewage-treatment-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeSewageTreatmentOperationRateV13,
  computeSewageTreatmentQualifiedRateV13,
  computeSewageTreatmentStandardRateV13,
  type SewageTreatmentQualityMgmtRecordV13,
} from "../aggregators/sewageTreatmentQualityMgmtV13Aggregator.js";

const records: SewageTreatmentQualityMgmtRecordV13[] = [
  { standardCount: 980, totalCount: 1000, qualifiedVolume: 950, totalVolume: 1000, actualHours: 900, shouldHours: 1000 },
  { standardCount: 980, totalCount: 1000, qualifiedVolume: 950, totalVolume: 1000, actualHours: 900, shouldHours: 1000 },
];

export const sewageTreatmentQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/sewage-treatment-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "sewage-treatment-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        sewageTreatmentStandardRate: computeSewageTreatmentStandardRateV13(records),
        sewageTreatmentQualifiedRate: computeSewageTreatmentQualifiedRateV13(records),
        sewageTreatmentOperationRate: computeSewageTreatmentOperationRateV13(records),
      }));
    },
  },
];
