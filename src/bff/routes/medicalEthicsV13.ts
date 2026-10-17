/**
 * 健澜科技 jlmedaios - 医德医风考评 V13 路由（M340-B）
 *
 * GET /api/v1/medical-ethics
 *
 * 权限：medical-ethics:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeCommendationCountV13,
  computeExcellentGoodRateV13,
  type MedicalEthicsRecordV13,
} from "../aggregators/medicalEthicsV13Aggregator.js";

const records: MedicalEthicsRecordV13[] = [
  { totalEvaluated: 100, excellentGoodCount: 95, commendationCount: 3 },
];

export const medicalEthicsV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/medical-ethics",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "medical-ethics:read");
      if (denied) return denied;
      return json(ok({
        excellentGoodRate: computeExcellentGoodRateV13(records),
        commendationCount: computeCommendationCountV13(records),
      }));
    },
  },
];
