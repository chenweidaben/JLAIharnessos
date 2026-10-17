/**
 * 健澜科技 jlmedaios - 护理感控 V13 路由（M389-B）
 *
 * GET /api/v1/nursing-infection-control
 *
 * 权限：nursing-infection-control:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAsepticOperationQualificationRateV13,
  computeCatheterRelatedInfectionRateV13,
  computeHandHygieneComplianceRateV13,
  type NursingInfectionControlRecordV13,
} from "../aggregators/nursingInfectionControlV13Aggregator.js";

const records: NursingInfectionControlRecordV13[] = [
  { compliantCount: 950, shouldExecuteCount: 1000, qualifiedCount: 900, inspectCount: 1000, infectionCount: 5, catheterDays: 1000 },
  { compliantCount: 950, shouldExecuteCount: 1000, qualifiedCount: 900, inspectCount: 1000, infectionCount: 5, catheterDays: 1000 },
];

export const nursingInfectionControlV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/nursing-infection-control",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "nursing-infection-control:read");
      if (denied) return denied;
      return json(ok({
        handHygieneComplianceRate: computeHandHygieneComplianceRateV13(records),
        asepticOperationQualificationRate: computeAsepticOperationQualificationRateV13(records),
        catheterRelatedInfectionRate: computeCatheterRelatedInfectionRateV13(records),
      }));
    },
  },
];
