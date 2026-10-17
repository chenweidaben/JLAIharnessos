/**
 * 健澜科技 jlmedaios - 费用控制 V13 路由（M375-B）
 *
 * GET /api/v1/medical-cost-control
 *
 * 权限：medical-cost-control:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDrugRatioV13,
  computeInpatientCostPerStayV13,
  computeOutpatientCostPerVisitV13,
  type MedicalCostControlRecordV13,
} from "../aggregators/medicalCostControlV13Aggregator.js";

const records: MedicalCostControlRecordV13[] = [
  { outpatientCostPerVisit: 150, inpatientCostPerStay: 5000, drugRevenue: 300000, medicalRevenue: 1000000 },
  { outpatientCostPerVisit: 150, inpatientCostPerStay: 5000, drugRevenue: 300000, medicalRevenue: 1000000 },
];

export const medicalCostControlV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/medical-cost-control",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "medical-cost-control:read");
      if (denied) return denied;
      return json(ok({
        outpatientCostPerVisit: computeOutpatientCostPerVisitV13(records),
        inpatientCostPerStay: computeInpatientCostPerStayV13(records),
        drugRatio: computeDrugRatioV13(records),
      }));
    },
  },
];
