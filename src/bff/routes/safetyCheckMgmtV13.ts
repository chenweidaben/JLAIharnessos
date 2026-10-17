/**
 * 健澜科技 jlmedaios - 安全核查管理 V13 路由（M426-C，换名避让旧版 surgeryVolumeV13（M339））
 *
 * GET /api/v1/safety-check-mgmt
 *
 * 权限：safety-check-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeSurgeryPauseExecutionRateV13,
  computeSurgerySafetyCheckRateV13,
  computeSurgerySiteMarkRateV13,
  type SafetyCheckMgmtRecordV13,
} from "../aggregators/safetyCheckMgmtV13Aggregator.js";

const records: SafetyCheckMgmtRecordV13[] = [
  { safetyCheckDone: 980, siteMarked: 950, pauseExecuted: 990, surgeryTotal: 1000 },
  { safetyCheckDone: 980, siteMarked: 950, pauseExecuted: 990, surgeryTotal: 1000 },
];

export const safetyCheckMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/safety-check-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "safety-check-mgmt:read");
      if (denied) return denied;
      return json(ok({
        surgerySafetyCheckRate: computeSurgerySafetyCheckRateV13(records),
        surgerySiteMarkRate: computeSurgerySiteMarkRateV13(records),
        surgeryPauseExecutionRate: computeSurgeryPauseExecutionRateV13(records),
      }));
    },
  },
];
