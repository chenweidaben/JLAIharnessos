/**
 * 健澜科技 jlmedaios - 手卫生质量管理 V13 路由（M441-B，医院感染管理组）
 *
 * GET /api/v1/hand-hygiene-quality
 *
 * 权限：hand-hygiene-quality:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeHandHygieneComplianceRateV13,
  computeHandHygieneFacilityIntegrityRateV13,
  computeHandHygieneQualifiedRateV13,
  type HandHygieneQualityRecordV13,
} from "../aggregators/handHygieneQualityV13Aggregator.js";

const records: HandHygieneQualityRecordV13[] = [
  { actualPerformed: 950, shouldPerform: 1000, qualifiedHandHygiene: 900, sampledHandHygiene: 1000, intactFacility: 980, totalFacility: 1000 },
  { actualPerformed: 950, shouldPerform: 1000, qualifiedHandHygiene: 900, sampledHandHygiene: 1000, intactFacility: 980, totalFacility: 1000 },
];

export const handHygieneQualityV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/hand-hygiene-quality",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "hand-hygiene-quality:read");
      if (denied) return denied;
      return json(ok({
        handHygieneComplianceRate: computeHandHygieneComplianceRateV13(records),
        handHygieneQualifiedRate: computeHandHygieneQualifiedRateV13(records),
        handHygieneFacilityIntegrityRate: computeHandHygieneFacilityIntegrityRateV13(records),
      }));
    },
  },
];
