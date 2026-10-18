/**
 * 健澜科技 jlmedaios - 不良事件上报管理 V13 路由（M439-A，患者安全与医疗风险管理组）
 *
 * GET /api/v1/adverse-event-reporting
 *
 * 权限：adverse-event-reporting:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAdverseEventReportingCountV13,
  computeAdverseEventReportingRcaCompletionRateV13,
  computeAdverseEventReportingTimelinessRateV13,
  type AdverseEventReportingRecordV13,
} from "../aggregators/adverseEventReportingV13Aggregator.js";

const records: AdverseEventReportingRecordV13[] = [
  { timelyReported: 950, totalReported: 1000, completedRca: 900, shouldRca: 1000 },
  { timelyReported: 950, totalReported: 1000, completedRca: 900, shouldRca: 1000 },
];

export const adverseEventReportingV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/adverse-event-reporting",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "adverse-event-reporting:read");
      if (denied) return denied;
      return json(ok({
        adverseEventReportingCount: computeAdverseEventReportingCountV13(records),
        adverseEventReportingTimelinessRate: computeAdverseEventReportingTimelinessRateV13(records),
        adverseEventReportingRcaCompletionRate: computeAdverseEventReportingRcaCompletionRateV13(records),
      }));
    },
  },
];
