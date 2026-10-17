/**
 * 健澜科技 jlmedaios - ICU 管理 V13 路由（M416-A）
 *
 * GET /api/v1/icu-mgmt
 *
 * 权限：icu-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeIcuApacheIIPassRateV13,
  computeIcuAverageLosDaysV13,
  computeIcuUnplannedExtubationRateV13,
  type IcuMgmtRecordV13,
} from "../aggregators/icuMgmtV13Aggregator.js";

const records: IcuMgmtRecordV13[] = [
  { apacheQualified: 900, icuPatientTotal: 1000, unplannedExtubation: 10, intubationTotal: 1000, losDays: 5.5 },
  { apacheQualified: 900, icuPatientTotal: 1000, unplannedExtubation: 10, intubationTotal: 1000, losDays: 6.5 },
];

export const icuMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/icu-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "icu-mgmt:read");
      if (denied) return denied;
      return json(ok({
        icuApacheIIPassRate: computeIcuApacheIIPassRateV13(records),
        icuUnplannedExtubationRate: computeIcuUnplannedExtubationRateV13(records),
        icuAverageLosDays: computeIcuAverageLosDaysV13(records),
      }));
    },
  },
];
