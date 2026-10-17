/**
 * 健澜科技 jlmedaios - 环境卫生学 V13 路由（M370-C）
 *
 * GET /api/v1/environmental-hygiene
 *
 * 权限：environmental-hygiene:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeEnvironmentSamplingPassRateV13,
  computeMedicalWasteDisposalComplianceRateV13,
  computeSewageDischargeComplianceRateV13,
  type EnvironmentalHygieneRecordV13,
} from "../aggregators/environmentalHygieneV13Aggregator.js";

const records: EnvironmentalHygieneRecordV13[] = [
  { sampleCount: 100, samplePass: 98, wasteDisposalCount: 100, wasteDisposalCompliant: 95, sewageTestCount: 100, sewageDischargeCompliant: 100 },
  { sampleCount: 100, samplePass: 98, wasteDisposalCount: 100, wasteDisposalCompliant: 95, sewageTestCount: 100, sewageDischargeCompliant: 100 },
];

export const environmentalHygieneV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/environmental-hygiene",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "environmental-hygiene:read");
      if (denied) return denied;
      return json(ok({
        environmentSamplingPassRate: computeEnvironmentSamplingPassRateV13(records),
        medicalWasteDisposalComplianceRate: computeMedicalWasteDisposalComplianceRateV13(records),
        sewageDischargeComplianceRate: computeSewageDischargeComplianceRateV13(records),
      }));
    },
  },
];
