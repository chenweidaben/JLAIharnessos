/**
 * 健澜科技 jlmedaios - 投诉管理明细 V13 路由（M398-A，避让旧版 complaintMgmtV13/complaintMgmtStatsV13）
 *
 * GET /api/v1/complaint-mgmt-detail
 *
 * 权限：complaint-mgmt-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeComplaintCountV13,
  computeComplaintHandlingTimelyRateV13,
  computeComplaintSatisfactionRateV13,
  type ComplaintMgmtDetailRecordV13,
} from "../aggregators/complaintMgmtDetailV13Aggregator.js";

const records: ComplaintMgmtDetailRecordV13[] = [
  { complaintCount: 10, timelyCount: 9, satisfiedCount: 8, handledCount: 9 },
  { complaintCount: 10, timelyCount: 9, satisfiedCount: 8, handledCount: 9 },
];

export const complaintMgmtDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/complaint-mgmt-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "complaint-mgmt-detail:read");
      if (denied) return denied;
      return json(ok({
        complaintCount: computeComplaintCountV13(records),
        complaintHandlingTimelyRate: computeComplaintHandlingTimelyRateV13(records),
        complaintSatisfactionRate: computeComplaintSatisfactionRateV13(records),
      }));
    },
  },
];
