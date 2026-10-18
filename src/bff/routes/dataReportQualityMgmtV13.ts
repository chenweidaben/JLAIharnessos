/**
 * 健澜科技 jlmedaios - 数据上报质量管理 V13 路由（M432-B，换名 dataReport + -quality 后缀避让旧版 dataQualityMgmtV13（M409））
 *
 * GET /api/v1/data-report-quality-mgmt
 *
 * 权限：data-report-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDataReportAccuracyRateV13,
  computeDataReportCompletenessRateV13,
  computeDataReportTimelinessRateV13,
  type DataReportQualityMgmtRecordV13,
} from "../aggregators/dataReportQualityMgmtV13Aggregator.js";

const records: DataReportQualityMgmtRecordV13[] = [
  { completeItems: 980, shouldReportItems: 1000, accurateRecords: 9500, reportRecords: 10000, timelyReports: 990, shouldReportTimes: 1000 },
  { completeItems: 980, shouldReportItems: 1000, accurateRecords: 9500, reportRecords: 10000, timelyReports: 990, shouldReportTimes: 1000 },
];

export const dataReportQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/data-report-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "data-report-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        dataReportCompletenessRate: computeDataReportCompletenessRateV13(records),
        dataReportAccuracyRate: computeDataReportAccuracyRateV13(records),
        dataReportTimelinessRate: computeDataReportTimelinessRateV13(records),
      }));
    },
  },
];
