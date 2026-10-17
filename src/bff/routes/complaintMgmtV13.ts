/**
 * 健澜科技 jlmedaios - 投诉管理 V13 路由（M354-C）
 *
 * GET /api/v1/complaint-mgmt
 *
 * 权限：complaint-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeClosureRateV13,
  computeFollowUpSatisfactionV13,
  computeRepeatComplaintRateV13,
  type ComplaintMgmtRecordV13,
} from "../aggregators/complaintMgmtV13Aggregator.js";

const records: ComplaintMgmtRecordV13[] = [
  { complaintCount: 100, closedCount: 95, followUpSatisfaction: 4.5, repeatComplaintCount: 5 },
  { complaintCount: 100, closedCount: 90, followUpSatisfaction: 4.7, repeatComplaintCount: 3 },
];

export const complaintMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/complaint-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "complaint-mgmt:read");
      if (denied) return denied;
      return json(ok({
        closureRate: computeClosureRateV13(records),
        followUpSatisfaction: computeFollowUpSatisfactionV13(records),
        repeatComplaintRate: computeRepeatComplaintRateV13(records),
      }));
    },
  },
];
