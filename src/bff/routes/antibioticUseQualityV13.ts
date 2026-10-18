/**
 * 健澜科技 jlmedaios - 抗菌药物使用质量管理 V13 路由（M440-B，药事管理与药学服务组）
 *
 * GET /api/v1/antibiotic-use-quality
 *
 * 权限：antibiotic-use-quality:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAntibioticUseDddsV13,
  computeAntibioticUseInpatientRateV13,
  computeAntibioticUseOutpatientRateV13,
  type AntibioticUseQualityRecordV13,
} from "../aggregators/antibioticUseQualityV13Aggregator.js";

const records: AntibioticUseQualityRecordV13[] = [
  { dddsTotal: 400, totalBedDays: 100, outpatientAntibioticPrescription: 200, outpatientTotalPrescription: 1000, inpatientAntibioticPatient: 300, inpatientTotalPatient: 1000 },
  { dddsTotal: 400, totalBedDays: 100, outpatientAntibioticPrescription: 200, outpatientTotalPrescription: 1000, inpatientAntibioticPatient: 300, inpatientTotalPatient: 1000 },
];

export const antibioticUseQualityV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/antibiotic-use-quality",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "antibiotic-use-quality:read");
      if (denied) return denied;
      return json(ok({
        antibioticUseDdds: computeAntibioticUseDddsV13(records),
        antibioticUseOutpatientRate: computeAntibioticUseOutpatientRateV13(records),
        antibioticUseInpatientRate: computeAntibioticUseInpatientRateV13(records),
      }));
    },
  },
];
