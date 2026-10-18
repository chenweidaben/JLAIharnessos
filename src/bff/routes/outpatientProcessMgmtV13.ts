/**
 * 健澜科技 jlmedaios - 门诊流程管理 V13 路由（M454-A，门急诊与手术麻醉管理组）
 *
 * GET /api/v1/outpatient-process-mgmt
 *
 * 权限：outpatient-process-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeOutpatientProcessAppointmentRateV13,
  computeOutpatientProcessRevisitRateV13,
  computeOutpatientProcessWaitingMinutesV13,
  type OutpatientProcessMgmtRecordV13,
} from "../aggregators/outpatientProcessMgmtV13Aggregator.js";

const records: OutpatientProcessMgmtRecordV13[] = [
  { appointed: 950, totalVisit: 1000, waitingMinutes: 14.3, revisit: 900 },
  { appointed: 950, totalVisit: 1000, waitingMinutes: 15.2, revisit: 900 },
];

export const outpatientProcessMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/outpatient-process-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "outpatient-process-mgmt:read");
      if (denied) return denied;
      return json(ok({
        outpatientProcessAppointmentRate: computeOutpatientProcessAppointmentRateV13(records),
        outpatientProcessWaitingMinutes: computeOutpatientProcessWaitingMinutesV13(records),
        outpatientProcessRevisitRate: computeOutpatientProcessRevisitRateV13(records),
      }));
    },
  },
];
