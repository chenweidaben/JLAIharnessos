/**
 * 健澜科技 jlmedaios - 传染病报告 V13 路由（M370-D，M370 收官）
 *
 * GET /api/v1/epidemic-report
 *
 * 权限：epidemic-report:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeEpidemicReportAccuracyRateV13,
  computeEpidemicReportOmissionRateV13,
  computeEpidemicReportTimelyRateV13,
  type EpidemicReportRecordV13,
} from "../aggregators/epidemicReportV13Aggregator.js";

const records: EpidemicReportRecordV13[] = [
  { reportTotal: 100, timelyReport: 95, accurateReport: 98, shouldReport: 102, omittedReport: 2 },
  { reportTotal: 100, timelyReport: 95, accurateReport: 98, shouldReport: 102, omittedReport: 2 },
];

export const epidemicReportV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/epidemic-report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "epidemic-report:read");
      if (denied) return denied;
      return json(ok({
        epidemicReportTimelyRate: computeEpidemicReportTimelyRateV13(records),
        epidemicReportAccuracyRate: computeEpidemicReportAccuracyRateV13(records),
        epidemicReportOmissionRate: computeEpidemicReportOmissionRateV13(records),
      }));
    },
  },
];
