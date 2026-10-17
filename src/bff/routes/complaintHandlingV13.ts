/**
 * 健澜科技 jlmedaios - 投诉处理 V13 路由（M340-A）
 *
 * GET /api/v1/complaint-handling
 *
 * 权限：complaint-handling:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAvgHandleDaysV13,
  computeClosureRateV13,
  computeComplaintCountV13,
  type ComplaintRecordV13,
} from "../aggregators/complaintHandlingV13Aggregator.js";

const records: ComplaintRecordV13[] = [
  { complaintCount: 1, closedCount: 1, handleDays: 3 },
  { complaintCount: 1, closedCount: 1, handleDays: 5 },
  { complaintCount: 1, closedCount: 0, handleDays: 7 },
];

export const complaintHandlingV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/complaint-handling",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "complaint-handling:read");
      if (denied) return denied;
      return json(ok({
        complaintCount: computeComplaintCountV13(records),
        closureRate: computeClosureRateV13(records),
        avgHandleDays: computeAvgHandleDaysV13(records),
      }));
    },
  },
];
