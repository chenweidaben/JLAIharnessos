/**
 * 健澜科技 jlmedaios - 护理质量管理 V13 路由（M453-A，护理管理组）
 *
 * GET /api/v1/nursing-quality-mgmt
 *
 * 权限：nursing-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeNursingDocumentWritingQualifiedRateV13,
  computeNursingMeasureImplementationRateV13,
  computeNursingQualityControlQualifiedRateV13,
  type NursingQualityMgmtRecordV13,
} from "../aggregators/nursingQualityMgmtV13Aggregator.js";

const records: NursingQualityMgmtRecordV13[] = [
  { qualified: 950, totalCheck: 1000, implemented: 900, totalMeasure: 1000, qualifiedDoc: 980, totalDocument: 1000 },
  { qualified: 950, totalCheck: 1000, implemented: 900, totalMeasure: 1000, qualifiedDoc: 980, totalDocument: 1000 },
];

export const nursingQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/nursing-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "nursing-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        nursingQualityControlQualifiedRate: computeNursingQualityControlQualifiedRateV13(records),
        nursingMeasureImplementationRate: computeNursingMeasureImplementationRateV13(records),
        nursingDocumentWritingQualifiedRate: computeNursingDocumentWritingQualifiedRateV13(records),
      }));
    },
  },
];
