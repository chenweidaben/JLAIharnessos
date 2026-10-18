/**
 * 健澜科技 jlmedaios - 统计管理 V13 路由（M450-D，M450 收官，宣传与党建管理组）
 *
 * GET /api/v1/statistics-mgmt
 *
 * 权限：statistics-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeStatisticsAnalysisReportCompletionRateV13,
  computeStatisticsDataAccuracyRateV13,
  computeStatisticsReportTimelinessRateV13,
  type StatisticsMgmtRecordV13,
} from "../aggregators/statisticsMgmtV13Aggregator.js";

const records: StatisticsMgmtRecordV13[] = [
  { timely: 950, shouldReport: 1000, accurate: 900, totalItems: 1000, completed: 980, totalReport: 1000 },
  { timely: 950, shouldReport: 1000, accurate: 900, totalItems: 1000, completed: 980, totalReport: 1000 },
];

export const statisticsMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/statistics-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "statistics-mgmt:read");
      if (denied) return denied;
      return json(ok({
        statisticsReportTimelinessRate: computeStatisticsReportTimelinessRateV13(records),
        statisticsDataAccuracyRate: computeStatisticsDataAccuracyRateV13(records),
        statisticsAnalysisReportCompletionRate: computeStatisticsAnalysisReportCompletionRateV13(records),
      }));
    },
  },
];
