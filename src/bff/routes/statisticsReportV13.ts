/**
 * 健澜科技 jlmedaios - 统计报表 V13 路由（M401-C）
 *
 * GET /api/v1/statistics-report
 *
 * 权限：statistics-report:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeStatisticalAnalysisReportCountV13,
  computeStatisticalDataAccuracyRateV13,
  computeStatutoryReportTimelyRateV13,
  type StatisticsReportRecordV13,
} from "../aggregators/statisticsReportV13Aggregator.js";

const records: StatisticsReportRecordV13[] = [
  { timelyReported: 950, totalReported: 1000, accurate: 980, totalChecked: 1000, reportCount: 5 },
  { timelyReported: 950, totalReported: 1000, accurate: 980, totalChecked: 1000, reportCount: 5 },
];

export const statisticsReportV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/statistics-report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "statistics-report:read");
      if (denied) return denied;
      return json(ok({
        statutoryReportTimelyRate: computeStatutoryReportTimelyRateV13(records),
        statisticalDataAccuracyRate: computeStatisticalDataAccuracyRateV13(records),
        statisticalAnalysisReportCount: computeStatisticalAnalysisReportCountV13(records),
      }));
    },
  },
];
