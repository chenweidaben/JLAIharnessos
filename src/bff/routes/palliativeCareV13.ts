/**
 * 健澜科技 jlmedaios - 安宁疗护 V13 路由（M350-D，M350 收官）
 *
 * GET /api/v1/palliative-care
 *
 * 权限：palliative-care:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeFamilySatisfactionV13,
  computeHospiceBedDaysV13,
  computePainAssessmentRateV13,
  type PalliativeCareRecordV13,
} from "../aggregators/palliativeCareV13Aggregator.js";

const records: PalliativeCareRecordV13[] = [
  { hospiceBedDays: 400, painAssessedCount: 80, palliativePatientsCount: 100, familySatisfaction: 4.5 },
  { hospiceBedDays: 300, painAssessedCount: 80, palliativePatientsCount: 100, familySatisfaction: 4.7 },
  { hospiceBedDays: 300, painAssessedCount: 80, palliativePatientsCount: 100, familySatisfaction: 4.8 },
];

export const palliativeCareV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/palliative-care",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "palliative-care:read");
      if (denied) return denied;
      return json(ok({
        hospiceBedDays: computeHospiceBedDaysV13(records),
        painAssessmentRate: computePainAssessmentRateV13(records),
        familySatisfaction: computeFamilySatisfactionV13(records),
      }));
    },
  },
];
