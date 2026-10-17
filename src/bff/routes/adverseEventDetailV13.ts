/**
 * 健澜科技 jlmedaios - 不良事件管理（细节）V13 路由（M413-D，M413 收官，detail 避让旧版 adverseEventReportV13）
 *
 * GET /api/v1/adverse-event-detail
 *
 * 权限：adverse-event-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAdverseEventReportRateV13,
  computeRectificationMeasureImplementationRateV13,
  computeRootCauseAnalysisCompletionRateV13,
  type AdverseEventDetailRecordV13,
} from "../aggregators/adverseEventDetailV13Aggregator.js";

const records: AdverseEventDetailRecordV13[] = [
  { reported: 980, shouldTotal: 1000, rootCauseDone: 95, eventTotal: 100, rectified: 99, shouldRectifyTotal: 100 },
  { reported: 980, shouldTotal: 1000, rootCauseDone: 95, eventTotal: 100, rectified: 99, shouldRectifyTotal: 100 },
];

export const adverseEventDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/adverse-event-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "adverse-event-detail:read");
      if (denied) return denied;
      return json(ok({
        adverseEventReportRate: computeAdverseEventReportRateV13(records),
        rootCauseAnalysisCompletionRate: computeRootCauseAnalysisCompletionRateV13(records),
        rectificationMeasureImplementationRate: computeRectificationMeasureImplementationRateV13(records),
      }));
    },
  },
];
