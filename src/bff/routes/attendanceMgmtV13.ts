/**
 * 健澜科技 jlmedaios - 考勤管理 V13 路由（M402-C）
 *
 * GET /api/v1/attendance-mgmt
 *
 * 权限：attendance-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAttendanceRateV13,
  computeLateEarlyRateV13,
  computeOvertimeHoursV13,
  type AttendanceMgmtRecordV13,
} from "../aggregators/attendanceMgmtV13Aggregator.js";

const records: AttendanceMgmtRecordV13[] = [
  { attended: 980, total: 1000, lateEarly: 20, totalAttendance: 1000, overtime: 10 },
  { attended: 980, total: 1000, lateEarly: 20, totalAttendance: 1000, overtime: 10 },
];

export const attendanceMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/attendance-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "attendance-mgmt:read");
      if (denied) return denied;
      return json(ok({
        attendanceRate: computeAttendanceRateV13(records),
        lateEarlyRate: computeLateEarlyRateV13(records),
        overtimeHours: computeOvertimeHoursV13(records),
      }));
    },
  },
];
