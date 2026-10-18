/**
 * 健澜科技 jlmedaios - 廉洁行医质量管理 V13 路由（M438-B，行风廉洁与职业道德建设组）
 *
 * GET /api/v1/integrity-quality-mgmt
 *
 * 权限：integrity-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeIntegrityEducationCoverageRateV13,
  computeIntegrityPetitionFilingRateV13,
  computeIntegrityViolationInvestigationRateV13,
  type IntegrityQualityMgmtRecordV13,
} from "../aggregators/integrityQualityMgmtV13Aggregator.js";

const records: IntegrityQualityMgmtRecordV13[] = [
  { trainedPeople: 950, shouldTrain: 1000, investigatedViolation: 950, totalViolation: 1000, resolvedPetition: 950, totalPetition: 1000 },
  { trainedPeople: 950, shouldTrain: 1000, investigatedViolation: 950, totalViolation: 1000, resolvedPetition: 950, totalPetition: 1000 },
];

export const integrityQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/integrity-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "integrity-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        integrityEducationCoverageRate: computeIntegrityEducationCoverageRateV13(records),
        integrityViolationInvestigationRate: computeIntegrityViolationInvestigationRateV13(records),
        integrityPetitionFilingRate: computeIntegrityPetitionFilingRateV13(records),
      }));
    },
  },
];
