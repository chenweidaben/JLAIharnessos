/**
 * 健澜科技 jlmedaios - 营养质量管理 V13 路由（M430-C，-quality 后缀避让旧版 nutritionMgmtV13（M415））
 *
 * GET /api/v1/nutrition-quality-mgmt
 *
 * 权限：nutrition-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeNutritionAssessmentCoverageRateV13,
  computeNutritionConsultationResponseRateV13,
  computeNutritionSupportAppropriateRateV13,
  type NutritionQualityMgmtRecordV13,
} from "../aggregators/nutritionQualityMgmtV13Aggregator.js";

const records: NutritionQualityMgmtRecordV13[] = [
  { assessed: 950, inpatientTotal: 1000, appropriate: 980, supportTotal: 1000, responded: 990, consultTotal: 1000 },
  { assessed: 950, inpatientTotal: 1000, appropriate: 980, supportTotal: 1000, responded: 990, consultTotal: 1000 },
];

export const nutritionQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/nutrition-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "nutrition-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        nutritionAssessmentCoverageRate: computeNutritionAssessmentCoverageRateV13(records),
        nutritionSupportAppropriateRate: computeNutritionSupportAppropriateRateV13(records),
        nutritionConsultationResponseRate: computeNutritionConsultationResponseRateV13(records),
      }));
    },
  },
];
