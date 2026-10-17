/**
 * 健澜科技 jlmedaios - 医护工作量与疲劳度监测 V13 路由（M311-B）
 *
 * GET /api/v1/staff-workload
 *
 * 权限：staff-workload:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  assessFatigueLevelV13,
  computeAvgTasksPerDayV13,
  identifyOverloadedStaffV13,
  type StaffWorkloadV13,
} from "../aggregators/staffWorkloadV13Aggregator.js";

const staffList: StaffWorkloadV13[] = [
  { staffId: "s1", name: "张医生", totalTasks: 15, workingDays: 5, overtimeHours: 4 },
  { staffId: "s2", name: "李护士", totalTasks: 10, workingDays: 5, overtimeHours: 2 },
  { staffId: "s3", name: "王医生", totalTasks: 5, workingDays: 5, overtimeHours: 0 },
];

export const staffWorkloadV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/staff-workload",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "staff-workload:read");
      if (denied) return denied;
      return json(ok({
        board: staffList.map((s) => ({
          ...s,
          avgPerDay: computeAvgTasksPerDayV13(s),
          fatigue: assessFatigueLevelV13(s),
        })),
        overloaded: identifyOverloadedStaffV13(staffList),
      }));
    },
  },
];
