/**
 * 健澜科技 jlmedaios - 压疮风险管理 V13 路由（M439-C，患者安全与医疗风险管理组）
 *
 * GET /api/v1/pressure-ulcer
 *
 * 权限：pressure-ulcer:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computePressureUlcerHealingRateV13,
  computePressureUlcerHighRiskAssessmentRateV13,
  computePressureUlcerHospitalRateV13,
  type PressureUlcerRecordV13,
} from "../aggregators/pressureUlcerV13Aggregator.js";

const records: PressureUlcerRecordV13[] = [
  { hospitalNewPressureUlcer: 15, totalBedDays: 10000, assessedHighRisk: 950, shouldAssess: 1000, healedPressureUlcer: 850, totalPressureUlcer: 1000 },
  { hospitalNewPressureUlcer: 15, totalBedDays: 10000, assessedHighRisk: 950, shouldAssess: 1000, healedPressureUlcer: 850, totalPressureUlcer: 1000 },
];

export const pressureUlcerV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/pressure-ulcer",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "pressure-ulcer:read");
      if (denied) return denied;
      return json(ok({
        pressureUlcerHospitalRate: computePressureUlcerHospitalRateV13(records),
        pressureUlcerHighRiskAssessmentRate: computePressureUlcerHighRiskAssessmentRateV13(records),
        pressureUlcerHealingRate: computePressureUlcerHealingRateV13(records),
      }));
    },
  },
];
