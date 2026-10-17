/**
 * 健澜科技 jlmedaios - 员工培训学时 V13 路由（M346-D，M346 收官）
 *
 * GET /api/v1/staff-training-hours
 *
 * 权限：staff-training-hours:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAvgAnnualHoursV13,
  computeExamPassRateV13,
  type StaffTrainingRecordV13,
} from "../aggregators/staffTrainingHoursV13Aggregator.js";

const records: StaffTrainingRecordV13[] = [
  { annualHours: 20, passedCount: 80, examinedCount: 100 },
  { annualHours: 30, passedCount: 90, examinedCount: 100 },
  { annualHours: 40, passedCount: 0, examinedCount: 0 },
];

export const staffTrainingHoursV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/staff-training-hours",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "staff-training-hours:read");
      if (denied) return denied;
      return json(ok({
        avgAnnualHours: computeAvgAnnualHoursV13(records),
        examPassRate: computeExamPassRateV13(records),
      }));
    },
  },
];
