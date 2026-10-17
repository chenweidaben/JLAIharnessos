/**
 * 健澜科技 jlmedaios - 护理质量 V13 路由（M358-A）
 *
 * GET /api/v1/nursing-quality
 *
 * 权限：nursing-quality:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeBasicNursingPassRateV13,
  computeNursingAdverseEventRateV13,
  computeSpecialGradeNursingPassRateV13,
  type NursingQualityRecordV13,
} from "../aggregators/nursingQualityV13Aggregator.js";

const records: NursingQualityRecordV13[] = [
  { basicNursingPassed: 95, basicNursingSampled: 100, specialGradeNursingPassed: 48, specialGradeNursingSampled: 50, nursingAdverseEventOccurred: 1, inpatientAdmissions: 2000 },
  { basicNursingPassed: 95, basicNursingSampled: 100, specialGradeNursingPassed: 47, specialGradeNursingSampled: 50, nursingAdverseEventOccurred: 1, inpatientAdmissions: 2000 },
];

export const nursingQualityV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/nursing-quality",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "nursing-quality:read");
      if (denied) return denied;
      return json(ok({
        basicNursingPassRate: computeBasicNursingPassRateV13(records),
        specialGradeNursingPassRate: computeSpecialGradeNursingPassRateV13(records),
        nursingAdverseEventRate: computeNursingAdverseEventRateV13(records),
      }));
    },
  },
];
