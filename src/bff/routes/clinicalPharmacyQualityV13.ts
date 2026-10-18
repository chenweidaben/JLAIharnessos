/**
 * 健澜科技 jlmedaios - 临床药学服务质量管理 V13 路由（M440-D，M440 收官，药事管理与药学服务组）
 *
 * GET /api/v1/clinical-pharmacy-quality
 *
 * 权限：clinical-pharmacy-quality:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeClinicalPharmacyMonitoringCoverageRateV13,
  computeClinicalPharmacyOrderReviewRateV13,
  computeClinicalPharmacyRoundParticipationRateV13,
  type ClinicalPharmacyQualityRecordV13,
} from "../aggregators/clinicalPharmacyQualityV13Aggregator.js";

const records: ClinicalPharmacyQualityRecordV13[] = [
  { participatedRound: 950, shouldParticipate: 1000, reviewedOrder: 900, totalOrder: 1000, monitoredPatient: 850, shouldMonitor: 1000 },
  { participatedRound: 950, shouldParticipate: 1000, reviewedOrder: 900, totalOrder: 1000, monitoredPatient: 850, shouldMonitor: 1000 },
];

export const clinicalPharmacyQualityV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/clinical-pharmacy-quality",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "clinical-pharmacy-quality:read");
      if (denied) return denied;
      return json(ok({
        clinicalPharmacyRoundParticipationRate: computeClinicalPharmacyRoundParticipationRateV13(records),
        clinicalPharmacyOrderReviewRate: computeClinicalPharmacyOrderReviewRateV13(records),
        clinicalPharmacyMonitoringCoverageRate: computeClinicalPharmacyMonitoringCoverageRateV13(records),
      }));
    },
  },
];
