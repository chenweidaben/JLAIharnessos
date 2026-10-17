/**
 * 健澜科技 jlmedaios - 患者流明细 V13 路由（M381-C）
 *
 * GET /api/v1/patient-flow-detail
 *
 * 权限：patient-flow-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAvgLOSDaysV13,
  computeAvgWaitingHoursV13,
  computeBedTurnoverCountV13,
  type PatientFlowDetailRecordV13,
} from "../aggregators/patientFlowDetailV13Aggregator.js";

const records: PatientFlowDetailRecordV13[] = [
  { totalWaitingMinutes: 3000, patientCount: 100, totalLOSDays: 8000, dischargeCount: 1000, avgOpenBedCount: 500 },
  { totalWaitingMinutes: 3000, patientCount: 100, totalLOSDays: 8000, dischargeCount: 1000, avgOpenBedCount: 500 },
];

export const patientFlowDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/patient-flow-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "patient-flow-detail:read");
      if (denied) return denied;
      return json(ok({
        avgWaitingMinutes: computeAvgWaitingHoursV13(records),
        avgLOSDays: computeAvgLOSDaysV13(records),
        bedTurnoverCount: computeBedTurnoverCountV13(records),
      }));
    },
  },
];
