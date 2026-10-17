/**
 * 健澜科技 jlmedaios - DIP 病种分值 V13 路由（M356-B）
 *
 * GET /api/v1/dip-score
 *
 * 权限：dip-score:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDipCoverageRateV13,
  computeDiseaseStructureIndexV13,
  computeInsuranceSurplusAmountV13,
  type DipScoreRecordV13,
} from "../aggregators/dipScoreV13Aggregator.js";

const records: DipScoreRecordV13[] = [
  { dipEnrolledDiseases: 80, totalDiseases: 100, diseaseStructureIndex: 1.05, insuranceSurplusAmount: 50.50 },
  { dipEnrolledDiseases: 70, totalDiseases: 100, diseaseStructureIndex: 0.95, insuranceSurplusAmount: 49.50 },
];

export const dipScoreV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/dip-score",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "dip-score:read");
      if (denied) return denied;
      return json(ok({
        dipCoverageRate: computeDipCoverageRateV13(records),
        diseaseStructureIndex: computeDiseaseStructureIndexV13(records),
        insuranceSurplusAmount: computeInsuranceSurplusAmountV13(records),
      }));
    },
  },
];
