/**
 * 健澜科技 jlmedaios - 儿科诊疗 V13 路由（M349-C）
 *
 * GET /api/v1/pediatric-care
 *
 * 权限：pediatric-care:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeInpatientVisitsV13,
  computeNebulizationRateV13,
  computeOutpatientVisitsV13,
  type PediatricCareRecordV13,
} from "../aggregators/pediatricCareV13Aggregator.js";

const records: PediatricCareRecordV13[] = [
  { outpatientVisits: 250, inpatientVisits: 20, nebulizationCount: 50 },
  { outpatientVisits: 250, inpatientVisits: 20, nebulizationCount: 50 },
];

export const pediatricCareV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/pediatric-care",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "pediatric-care:read");
      if (denied) return denied;
      return json(ok({
        outpatientVisits: computeOutpatientVisitsV13(records),
        inpatientVisits: computeInpatientVisitsV13(records),
        nebulizationRate: computeNebulizationRateV13(records),
      }));
    },
  },
];
