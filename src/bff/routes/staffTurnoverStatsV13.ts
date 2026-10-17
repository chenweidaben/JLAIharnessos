/**
 * 健澜科技 jlmedaios - 员工流失率 V13 路由（M346-A，stats 避让已有 staffTurnoverV13）
 *
 * GET /api/v1/staff-turnover-stats
 *
 * 权限：staff-turnover-stats:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAvgActiveStaffV13,
  computeMonthlyResignCountV13,
  computeTurnoverRateV13,
  type StaffTurnoverRecordV13,
} from "../aggregators/staffTurnoverStatsV13Aggregator.js";

const records: StaffTurnoverRecordV13[] = [
  { resignCount: 1, avgActiveStaff: 200 },
  { resignCount: 1, avgActiveStaff: 200 },
];

export const staffTurnoverStatsV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/staff-turnover-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "staff-turnover-stats:read");
      if (denied) return denied;
      return json(ok({
        resignCount: computeMonthlyResignCountV13(records),
        avgActiveStaff: computeAvgActiveStaffV13(records),
        turnoverRate: computeTurnoverRateV13(records),
      }));
    },
  },
];
