/**
 * 健澜科技 jlmedaios - 抢救记录管理 V13 路由（M426-A，换名避让旧版 rescueMgmtV13（M415））
 *
 * GET /api/v1/rescue-record-mgmt
 *
 * 权限：rescue-record-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeRescueRecordCompleteRateV13,
  computeRescueRecordPassRateV13,
  computeRescueRecordTimelyRateV13,
  type RescueRecordMgmtRecordV13,
} from "../aggregators/rescueRecordMgmtV13Aggregator.js";

const records: RescueRecordMgmtRecordV13[] = [
  { recordComplete: 980, recordTimely: 950, recordPass: 990, rescueTotal: 1000 },
  { recordComplete: 980, recordTimely: 950, recordPass: 990, rescueTotal: 1000 },
];

export const rescueRecordMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/rescue-record-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "rescue-record-mgmt:read");
      if (denied) return denied;
      return json(ok({
        rescueRecordCompleteRate: computeRescueRecordCompleteRateV13(records),
        rescueRecordTimelyRate: computeRescueRecordTimelyRateV13(records),
        rescueRecordPassRate: computeRescueRecordPassRateV13(records),
      }));
    },
  },
];
