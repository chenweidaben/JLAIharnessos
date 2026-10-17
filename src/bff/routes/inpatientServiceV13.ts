/**
 * 健澜科技 jlmedaios - 住院服务 V13 路由（M373-A）
 *
 * GET /api/v1/inpatient-service
 *
 * 权限：inpatient-service:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAverageLodgingDaysV13,
  computeDischargeCountV13,
  computeInpatientCountV13,
  type InpatientServiceRecordV13,
} from "../aggregators/inpatientServiceV13Aggregator.js";

const records: InpatientServiceRecordV13[] = [
  { inpatientCount: 500, dischargeCount: 480, averageLodgingDays: 7 },
  { inpatientCount: 500, dischargeCount: 480, averageLodgingDays: 7 },
];

export const inpatientServiceV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/inpatient-service",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "inpatient-service:read");
      if (denied) return denied;
      return json(ok({
        inpatientCount: computeInpatientCountV13(records),
        dischargeCount: computeDischargeCountV13(records),
        averageLodgingDays: computeAverageLodgingDaysV13(records),
      }));
    },
  },
];
