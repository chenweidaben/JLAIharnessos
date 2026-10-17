/**
 * 健澜科技 jlmedaios - 中医服务 V13 路由（M350-A）
 *
 * GET /api/v1/tcm-service
 *
 * 权限：tcm-service:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeNonDrugTherapyRateV13,
  computeTcmInpatientRatioV13,
  computeTcmOutpatientVisitsV13,
  type TcmServiceRecordV13,
} from "../aggregators/tcmServiceV13Aggregator.js";

const records: TcmServiceRecordV13[] = [
  { tcmOutpatientVisits: 500, tcmBedDays: 500, totalBedDays: 1000, nonDrugTherapyCount: 150 },
  { tcmOutpatientVisits: 500, tcmBedDays: 500, totalBedDays: 1000, nonDrugTherapyCount: 150 },
];

export const tcmServiceV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/tcm-service",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "tcm-service:read");
      if (denied) return denied;
      return json(ok({
        tcmOutpatientVisits: computeTcmOutpatientVisitsV13(records),
        tcmInpatientRatio: computeTcmInpatientRatioV13(records),
        nonDrugTherapyRate: computeNonDrugTherapyRateV13(records),
      }));
    },
  },
];
