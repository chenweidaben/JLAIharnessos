/**
 * 健澜科技 jlmedaios - 麻醉记录管理 V13 路由（M426-B，换名避让旧版 anesthesiaComplicationV13（M339））
 *
 * GET /api/v1/anesthesia-record-mgmt
 *
 * 权限：anesthesia-record-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAnesthesiaRecordCompleteRateV13,
  computeAnesthesiaRecordPassRateV13,
  computeAnesthesiaRecordTimelyRateV13,
  type AnesthesiaRecordMgmtRecordV13,
} from "../aggregators/anesthesiaRecordMgmtV13Aggregator.js";

const records: AnesthesiaRecordMgmtRecordV13[] = [
  { completeAnes: 980, timelyAnes: 950, passAnes: 990, anesTotal: 1000 },
  { completeAnes: 980, timelyAnes: 950, passAnes: 990, anesTotal: 1000 },
];

export const anesthesiaRecordMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/anesthesia-record-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "anesthesia-record-mgmt:read");
      if (denied) return denied;
      return json(ok({
        anesthesiaRecordCompleteRate: computeAnesthesiaRecordCompleteRateV13(records),
        anesthesiaRecordTimelyRate: computeAnesthesiaRecordTimelyRateV13(records),
        anesthesiaRecordPassRate: computeAnesthesiaRecordPassRateV13(records),
      }));
    },
  },
];
