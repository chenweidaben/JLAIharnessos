/**
 * 健澜科技 jlmedaios - 膳食质量管理 V13 路由（M437-A，后勤保障与环境管理深化组）
 *
 * GET /api/v1/catering-quality-mgmt
 *
 * 权限：catering-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeCateringCostControlRateV13,
  computeCateringPatientSatisfactionRateV13,
  computeCateringQualifiedRateV13,
  type CateringQualityMgmtRecordV13,
} from "../aggregators/cateringQualityMgmtV13Aggregator.js";

const records: CateringQualityMgmtRecordV13[] = [
  { qualifiedMeals: 980, totalMeals: 1000, satisfiedPatients: 920, surveyedPatients: 1000, actualCost: 900, budgetCost: 1000 },
  { qualifiedMeals: 980, totalMeals: 1000, satisfiedPatients: 920, surveyedPatients: 1000, actualCost: 900, budgetCost: 1000 },
];

export const cateringQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/catering-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "catering-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        cateringQualifiedRate: computeCateringQualifiedRateV13(records),
        cateringPatientSatisfactionRate: computeCateringPatientSatisfactionRateV13(records),
        cateringCostControlRate: computeCateringCostControlRateV13(records),
      }));
    },
  },
];
