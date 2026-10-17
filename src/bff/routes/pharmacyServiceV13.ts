/**
 * 健澜科技 jlmedaios - 药学服务 V13 路由（M359-A）
 *
 * GET /api/v1/pharmacy-service
 *
 * 权限：pharmacy-service:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeClinicalPharmacistRoundRateV13,
  computeInpatientOrderPassRateV13,
  computeOutpatientPrescriptionPassRateV13,
  type PharmacyServiceRecordV13,
} from "../aggregators/pharmacyServiceV13Aggregator.js";

const records: PharmacyServiceRecordV13[] = [
  { outpatientPrescriptionPassed: 95, outpatientPrescriptionCount: 100, inpatientOrderPassed: 480, inpatientOrderCount: 500, clinicalPharmacistRounds: 90, shouldRounds: 100 },
  { outpatientPrescriptionPassed: 95, outpatientPrescriptionCount: 100, inpatientOrderPassed: 470, inpatientOrderCount: 500, clinicalPharmacistRounds: 90, shouldRounds: 100 },
];

export const pharmacyServiceV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/pharmacy-service",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "pharmacy-service:read");
      if (denied) return denied;
      return json(ok({
        outpatientPrescriptionPassRate: computeOutpatientPrescriptionPassRateV13(records),
        inpatientOrderPassRate: computeInpatientOrderPassRateV13(records),
        clinicalPharmacistRoundRate: computeClinicalPharmacistRoundRateV13(records),
      }));
    },
  },
];
