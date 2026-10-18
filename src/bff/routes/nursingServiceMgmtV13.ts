/**
 * 健澜科技 jlmedaios - 护理服务管理 V13 路由（M453-D，M453 收官，护理管理组）
 *
 * GET /api/v1/nursing-service-mgmt
 *
 * 权限：nursing-service-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeNursingBasicCareQualifiedRateV13,
  computeNursingClassifiedCareImplementationRateV13,
  computeNursingSatisfactionRateV13,
  type NursingServiceMgmtRecordV13,
} from "../aggregators/nursingServiceMgmtV13Aggregator.js";

const records: NursingServiceMgmtRecordV13[] = [
  { qualified: 950, totalCheck: 1000, inPlace: 900, totalClassified: 1000, satisfied: 980, totalSurvey: 1000 },
  { qualified: 950, totalCheck: 1000, inPlace: 900, totalClassified: 1000, satisfied: 980, totalSurvey: 1000 },
];

export const nursingServiceMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/nursing-service-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "nursing-service-mgmt:read");
      if (denied) return denied;
      return json(ok({
        nursingBasicCareQualifiedRate: computeNursingBasicCareQualifiedRateV13(records),
        nursingClassifiedCareImplementationRate: computeNursingClassifiedCareImplementationRateV13(records),
        nursingSatisfactionRate: computeNursingSatisfactionRateV13(records),
      }));
    },
  },
];
