/**
 * 健澜科技 jlmedaios - 投诉管理（统计）V13 路由（M365-B，stats避让）
 *
 * GET /api/v1/complaint-mgmt-stats
 *
 * 权限：complaint-mgmt-stats:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeComplaintResolveRateV13,
  computeComplaintTimelyRateV13,
  computeRepeatComplaintRateV13,
  type ComplaintMgmtStatsRecordV13,
} from "../aggregators/complaintMgmtStatsV13Aggregator.js";

const records: ComplaintMgmtStatsRecordV13[] = [
  { complaintCount: 100, timelyProcessed: 95, resolved: 90, repeated: 5 },
  { complaintCount: 100, timelyProcessed: 95, resolved: 90, repeated: 5 },
];

export const complaintMgmtStatsV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/complaint-mgmt-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "complaint-mgmt-stats:read");
      if (denied) return denied;
      return json(ok({
        complaintTimelyRate: computeComplaintTimelyRateV13(records),
        complaintResolveRate: computeComplaintResolveRateV13(records),
        repeatComplaintRate: computeRepeatComplaintRateV13(records),
      }));
    },
  },
];
