/**
 * 健澜科技 jlmedaios - 抗菌药物处方率 V13 路由（M336-C）
 *
 * GET /api/v1/antibiotic-rx
 *
 * 权限：antibiotic-rx:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeInpatientUseRateV13,
  computeOutpatientRxRateV13,
  computeTypeIPreventiveRateV13,
  type AntibioticRxRecordV13,
} from "../aggregators/antibioticRxV13Aggregator.js";

const records: AntibioticRxRecordV13[] = [
  {
    outpatientTotalRx: 1000,
    outpatientAntibioticRx: 200,
    inpatientTotalPatients: 500,
    inpatientAntibioticPatients: 250,
    typeITotalIncisions: 100,
    typeIPreventiveUse: 30,
  },
];

export const antibioticRxV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/antibiotic-rx",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "antibiotic-rx:read");
      if (denied) return denied;
      return json(ok({
        outpatientRxRate: computeOutpatientRxRateV13(records),
        inpatientUseRate: computeInpatientUseRateV13(records),
        typeIPreventiveRate: computeTypeIPreventiveRateV13(records),
      }));
    },
  },
];
