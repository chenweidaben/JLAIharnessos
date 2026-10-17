/**
 * 健澜科技 jlmedaios - KPI 总览看板 V13 路由（M354-A）
 *
 * GET /api/v1/kpi-dashboard
 *
 * 权限：kpi-dashboard:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAvgLOSV13,
  computeDischargedPatientsV13,
  computeOutpatientEmergencyVisitsV13,
  computeSurgeryCountV13,
  type KpiDashboardRecordV13,
} from "../aggregators/kpiDashboardV13Aggregator.js";

const records: KpiDashboardRecordV13[] = [
  { outpatientEmergencyVisits: 5000, dischargedPatients: 1000, surgeryCount: 200, avgLOS: 8 },
  { outpatientEmergencyVisits: 5000, dischargedPatients: 1000, surgeryCount: 200, avgLOS: 10 },
];

export const kpiDashboardV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/kpi-dashboard",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "kpi-dashboard:read");
      if (denied) return denied;
      return json(ok({
        outpatientEmergencyVisits: computeOutpatientEmergencyVisitsV13(records),
        dischargedPatients: computeDischargedPatientsV13(records),
        surgeryCount: computeSurgeryCountV13(records),
        avgLOS: computeAvgLOSV13(records),
      }));
    },
  },
];
