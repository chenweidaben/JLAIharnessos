/**
 * 健澜科技 jlmedaios - 慢病管理 V13 路由（M337-D）
 *
 * GET /api/v1/chronic-disease-stats
 *
 * 权限：chronic-disease-stats:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDiabetesManagementRateV13,
  computeHypertensionManagementRateV13,
  type ChronicDiseaseRecordV13,
} from "../aggregators/chronicDiseaseV13Aggregator.js";

const records: ChronicDiseaseRecordV13[] = [
  { hypertensionPatients: 1000, hypertensionManaged: 800, diabetesPatients: 500, diabetesManaged: 400 },
];

export const chronicDiseaseV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/chronic-disease-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "chronic-disease-stats:read");
      if (denied) return denied;
      return json(ok({
        hypertensionRate: computeHypertensionManagementRateV13(records),
        diabetesRate: computeDiabetesManagementRateV13(records),
      }));
    },
  },
];
