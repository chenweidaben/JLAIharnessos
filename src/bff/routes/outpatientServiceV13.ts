/**
 * 健澜科技 jlmedaios - 门诊服务 V13 路由（M372-A）
 *
 * GET /api/v1/outpatient-service
 *
 * 权限：outpatient-service:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeOutpatientAppointmentRateV13,
  computeOutpatientAverageWaitTimeV13,
  computeOutpatientCountV13,
  type OutpatientServiceRecordV13,
} from "../aggregators/outpatientServiceV13Aggregator.js";

const records: OutpatientServiceRecordV13[] = [
  { outpatientCount: 1000, averageWaitTime: 15, appointmentCount: 800 },
  { outpatientCount: 1000, averageWaitTime: 15, appointmentCount: 800 },
];

export const outpatientServiceV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/outpatient-service",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "outpatient-service:read");
      if (denied) return denied;
      return json(ok({
        outpatientCount: computeOutpatientCountV13(records),
        outpatientAverageWaitTime: computeOutpatientAverageWaitTimeV13(records),
        outpatientAppointmentRate: computeOutpatientAppointmentRateV13(records),
      }));
    },
  },
];
