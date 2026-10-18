/**
 * 健澜科技 jlmedaios - 投诉处理管理 V13 路由（M451-B，医患关系与投诉管理组）
 *
 * GET /api/v1/complaint-handling-mgmt
 *
 * 权限：complaint-handling-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeComplaintHandlingAcceptanceTimelinessRateV13,
  computeComplaintHandlingClosureRateV13,
  computeComplaintHandlingSatisfactionRateV13,
  type ComplaintHandlingMgmtRecordV13,
} from "../aggregators/complaintHandlingMgmtV13Aggregator.js";

const records: ComplaintHandlingMgmtRecordV13[] = [
  { timelyAccept: 950, totalComplaint: 1000, closed: 900, satisfied: 980, totalClosed: 1000 },
  { timelyAccept: 950, totalComplaint: 1000, closed: 900, satisfied: 980, totalClosed: 1000 },
];

export const complaintHandlingMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/complaint-handling-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "complaint-handling-mgmt:read");
      if (denied) return denied;
      return json(ok({
        complaintHandlingAcceptanceTimelinessRate: computeComplaintHandlingAcceptanceTimelinessRateV13(records),
        complaintHandlingClosureRate: computeComplaintHandlingClosureRateV13(records),
        complaintHandlingSatisfactionRate: computeComplaintHandlingSatisfactionRateV13(records),
      }));
    },
  },
];
