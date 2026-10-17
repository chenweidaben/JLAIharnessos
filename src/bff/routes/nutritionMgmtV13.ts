/**
 * 健澜科技 jlmedaios - 营养管理 V13 路由（M415-D，M415 收官）
 *
 * GET /api/v1/nutrition-mgmt
 *
 * 权限：nutrition-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAdmissionNutritionRiskScreeningRateV13,
  computeEnteralNutritionImplementationPassRateV13,
  computeNutritionTherapyAssessmentRateV13,
  type NutritionMgmtRecordV13,
} from "../aggregators/nutritionMgmtV13Aggregator.js";

const records: NutritionMgmtRecordV13[] = [
  { screened: 990, admissionTotal: 1000, assessed: 950, needNutritionTherapyTotal: 1000, qualified: 980, enteralTotal: 1000 },
  { screened: 990, admissionTotal: 1000, assessed: 950, needNutritionTherapyTotal: 1000, qualified: 980, enteralTotal: 1000 },
];

export const nutritionMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/nutrition-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "nutrition-mgmt:read");
      if (denied) return denied;
      return json(ok({
        admissionNutritionRiskScreeningRate: computeAdmissionNutritionRiskScreeningRateV13(records),
        nutritionTherapyAssessmentRate: computeNutritionTherapyAssessmentRateV13(records),
        enteralNutritionImplementationPassRate: computeEnteralNutritionImplementationPassRateV13(records),
      }));
    },
  },
];
