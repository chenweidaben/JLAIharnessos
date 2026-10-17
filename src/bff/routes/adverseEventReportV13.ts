/**
 * 健澜科技 jlmedaios - 不良事件上报 V13 路由（M387-D，M387 收官）
 *
 * GET /api/v1/adverse-event-report
 *
 * 权限：adverse-event-report:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAdverseEventReportCountV13,
  computeReportTimelinessRateV13,
  computeRootCauseAnalysisCompletionRateV13,
  type AdverseEventReportRecordV13,
} from "../aggregators/adverseEventReportV13Aggregator.js";

const records: AdverseEventReportRecordV13[] = [
  { reportCount: 20, timelyCount: 38, totalCount: 40, completedRcaCount: 36, shouldRcaCount: 40 },
  { reportCount: 20, timelyCount: 38, totalCount: 40, completedRcaCount: 36, shouldRcaCount: 40 },
];

export const adverseEventReportV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/adverse-event-report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "adverse-event-report:read");
      if (denied) return denied;
      return json(ok({
        adverseEventReportCount: computeAdverseEventReportCountV13(records),
        reportTimelinessRate: computeReportTimelinessRateV13(records),
        rootCauseAnalysisCompletionRate: computeRootCauseAnalysisCompletionRateV13(records),
      }));
    },
  },
];
