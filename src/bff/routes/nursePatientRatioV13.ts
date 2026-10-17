/**
 * 健澜科技 jlmedaios - 护患比 V13 路由（M346-C）
 *
 * GET /api/v1/nurse-patient-ratio
 *
 * 权限：nurse-patient-ratio:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeBedCountV13,
  computeNurseCountV13,
  computeNursePatientRatioV13,
  type NursePatientRatioRecordV13,
} from "../aggregators/nursePatientRatioV13Aggregator.js";

const records: NursePatientRatioRecordV13[] = [
  { bedCount: 100, nurseCount: 50 },
  { bedCount: 100, nurseCount: 50 },
];

export const nursePatientRatioV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/nurse-patient-ratio",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "nurse-patient-ratio:read");
      if (denied) return denied;
      return json(ok({
        bedCount: computeBedCountV13(records),
        nurseCount: computeNurseCountV13(records),
        ratio: computeNursePatientRatioV13(records),
      }));
    },
  },
];
