/**
 * 健澜科技 jlmedaios - 急诊管理 V13 路由（M416-B）
 *
 * GET /api/v1/er-mgmt
 *
 * 权限：er-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeErRescueRoomAvgStayHoursV13,
  computeErStayOver48hRateV13,
  computeErTriageAccuracyRateV13,
  type ErMgmtRecordV13,
} from "../aggregators/erMgmtV13Aggregator.js";

const records: ErMgmtRecordV13[] = [
  { accurate: 950, triageTotal: 1000, over48h: 20, erPatientTotal: 1000, stayHours: 3.2 },
  { accurate: 950, triageTotal: 1000, over48h: 20, erPatientTotal: 1000, stayHours: 4.5 },
];

export const erMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/er-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "er-mgmt:read");
      if (denied) return denied;
      return json(ok({
        erTriageAccuracyRate: computeErTriageAccuracyRateV13(records),
        erStayOver48hRate: computeErStayOver48hRateV13(records),
        erRescueRoomAvgStayHours: computeErRescueRoomAvgStayHoursV13(records),
      }));
    },
  },
];
