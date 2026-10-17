/**
 * 健澜科技 jlmedaios - 运营管理 V13 路由（M364-A）
 *
 * GET /api/v1/operation-mgmt
 *
 * 权限：operation-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAvgLOSV13,
  computeBedTurnoverRateV13,
  computeSurgeryIntervalDaysV13,
  type OperationMgmtRecordV13,
} from "../aggregators/operationMgmtV13Aggregator.js";

const records: OperationMgmtRecordV13[] = [
  { avgLOS: 8, bedTurnoverDischarged: 950, avgOpenBeds: 200, surgeryIntervalDays: 3 },
  { avgLOS: 10, bedTurnoverDischarged: 950, avgOpenBeds: 200, surgeryIntervalDays: 3 },
];

export const operationMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/operation-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "operation-mgmt:read");
      if (denied) return denied;
      return json(ok({
        avgLOS: computeAvgLOSV13(records),
        bedTurnoverRate: computeBedTurnoverRateV13(records),
        surgeryIntervalDays: computeSurgeryIntervalDaysV13(records),
      }));
    },
  },
];
