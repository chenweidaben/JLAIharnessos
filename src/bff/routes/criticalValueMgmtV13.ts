/**
 * 健澜科技 jlmedaios - 危急值管理 V13 路由（M411-A）
 *
 * GET /api/v1/critical-value-mgmt
 *
 * 权限：critical-value-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeCriticalValueClosedLoopRateV13,
  computeCriticalValueRegistrationPassRateV13,
  computeCriticalValueReportTimelyRateV13,
  type CriticalValueMgmtRecordV13,
} from "../aggregators/criticalValueMgmtV13Aggregator.js";

const records: CriticalValueMgmtRecordV13[] = [
  { timely: 98, total: 100, closedLoop: 95, registered: 99, registrationTotal: 100 },
  { timely: 98, total: 100, closedLoop: 95, registered: 99, registrationTotal: 100 },
];

export const criticalValueMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/critical-value-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "critical-value-mgmt:read");
      if (denied) return denied;
      return json(ok({
        criticalValueReportTimelyRate: computeCriticalValueReportTimelyRateV13(records),
        criticalValueClosedLoopRate: computeCriticalValueClosedLoopRateV13(records),
        criticalValueRegistrationPassRate: computeCriticalValueRegistrationPassRateV13(records),
      }));
    },
  },
];
