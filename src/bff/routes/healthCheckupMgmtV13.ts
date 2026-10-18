/**
 * 健澜科技 jlmedaios - 健康管理体检管理 V13 路由（M459-B，医院运营与健康管理组）
 *
 * GET /api/v1/health-checkup-mgmt
 *
 * 权限：health-checkup-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeHealthCheckupAbnormalFollowupRateV13,
  computeHealthCheckupAppointmentRateV13,
  computeHealthCheckupReportIssueTimelyRateV13,
  type HealthCheckupMgmtRecordV13,
} from "../aggregators/healthCheckupMgmtV13Aggregator.js";

const records: HealthCheckupMgmtRecordV13[] = [
  { booked: 950, total: 1000, timely: 900, totalReport: 1000, followedUp: 980, totalAbnormal: 1000 },
  { booked: 950, total: 1000, timely: 900, totalReport: 1000, followedUp: 980, totalAbnormal: 1000 },
];

export const healthCheckupMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/health-checkup-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "health-checkup-mgmt:read");
      if (denied) return denied;
      return json(ok({
        healthCheckupAppointmentRate: computeHealthCheckupAppointmentRateV13(records),
        healthCheckupReportIssueTimelyRate: computeHealthCheckupReportIssueTimelyRateV13(records),
        healthCheckupAbnormalFollowupRate: computeHealthCheckupAbnormalFollowupRateV13(records),
      }));
    },
  },
];
