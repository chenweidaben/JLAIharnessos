/**
 * 健澜科技 jlmedaios - 护理质量 V13 路由（M389-A）
 *
 * GET /api/v1/nursing-care-quality
 *
 * 权限：nursing-care-quality:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeBasicNursingQualificationRateV13,
  computeNursingMeasureImplementationRateV13,
  computeSpecialNursingQualificationRateV13,
  type NursingCareQualityRecordV13,
} from "../aggregators/nursingCareQualityV13Aggregator.js";

const records: NursingCareQualityRecordV13[] = [
  { basicQualifiedCount: 950, basicInspectCount: 1000, specialQualifiedCount: 900, specialInspectCount: 1000, implementedCount: 980, shouldImplementCount: 1000 },
  { basicQualifiedCount: 950, basicInspectCount: 1000, specialQualifiedCount: 900, specialInspectCount: 1000, implementedCount: 980, shouldImplementCount: 1000 },
];

export const nursingCareQualityV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/nursing-care-quality",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "nursing-care-quality:read");
      if (denied) return denied;
      return json(ok({
        basicNursingQualificationRate: computeBasicNursingQualificationRateV13(records),
        specialNursingQualificationRate: computeSpecialNursingQualificationRateV13(records),
        nursingMeasureImplementationRate: computeNursingMeasureImplementationRateV13(records),
      }));
    },
  },
];
