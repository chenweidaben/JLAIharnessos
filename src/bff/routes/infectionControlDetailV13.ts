/**
 * 健澜科技 jlmedaios - 院感控制（细节）V13 路由（M418-C，detail 避让旧版 handHygieneCompliance/ICUInfectionRate/infectionReportMgmt 等院感系列）
 *
 * GET /api/v1/infection-control-detail
 *
 * 权限：infection-control-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeEnvironmentalSurfaceSamplingPassRateV13,
  computeHandHygieneComplianceRateV13,
  computeMedicalWasteDisposalPassRateV13,
  type InfectionControlDetailRecordV13,
} from "../aggregators/infectionControlDetailV13Aggregator.js";

const records: InfectionControlDetailRecordV13[] = [
  { compliant: 950, shouldExecuteTotal: 1000, sampleQualified: 980, sampleTotal: 1000, disposalCompliant: 990, disposalTotal: 1000 },
  { compliant: 950, shouldExecuteTotal: 1000, sampleQualified: 980, sampleTotal: 1000, disposalCompliant: 990, disposalTotal: 1000 },
];

export const infectionControlDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/infection-control-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "infection-control-detail:read");
      if (denied) return denied;
      return json(ok({
        handHygieneComplianceRate: computeHandHygieneComplianceRateV13(records),
        environmentalSurfaceSamplingPassRate: computeEnvironmentalSurfaceSamplingPassRateV13(records),
        medicalWasteDisposalPassRate: computeMedicalWasteDisposalPassRateV13(records),
      }));
    },
  },
];
