/**
 * 健澜科技 jlmedaios - 分诊管理 V13 路由（M390-B）
 *
 * GET /api/v1/triage-mgmt
 *
 * 权限：triage-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeEmergencyTriageAccuracyRateV13,
  computeLevel4AbovePatientRatioV13,
  computeWaitingTimeAvgV13,
  type TriageMgmtRecordV13,
} from "../aggregators/triageMgmtV13Aggregator.js";

const records: TriageMgmtRecordV13[] = [
  { accurateCount: 950, totalTriageCount: 1000, totalWaitMinutes: 6000, patientCount: 200, level4AboveCount: 100, totalErCount: 1000 },
  { accurateCount: 950, totalTriageCount: 1000, totalWaitMinutes: 6000, patientCount: 200, level4AboveCount: 100, totalErCount: 1000 },
];

export const triageMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/triage-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "triage-mgmt:read");
      if (denied) return denied;
      return json(ok({
        emergencyTriageAccuracyRate: computeEmergencyTriageAccuracyRateV13(records),
        waitingTimeAvg: computeWaitingTimeAvgV13(records),
        level4AbovePatientRatio: computeLevel4AbovePatientRatioV13(records),
      }));
    },
  },
];
