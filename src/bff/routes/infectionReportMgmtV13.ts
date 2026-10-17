/**
 * 健澜科技 jlmedaios - 院感报告管理 V13 路由（M412-D，M412 收官）
 *
 * GET /api/v1/infection-report-mgmt
 *
 * 权限：infection-report-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeInfectionMissedReportRateV13,
  computeInfectionOutbreakResponseTimeV13,
  computeInfectionReportTimelyRateV13,
  type InfectionReportMgmtRecordV13,
} from "../aggregators/infectionReportMgmtV13Aggregator.js";

const records: InfectionReportMgmtRecordV13[] = [
  { timely: 980, total: 1000, missed: 10, shouldTotal: 1000, responseTime: 2.5 },
  { timely: 980, total: 1000, missed: 10, shouldTotal: 1000, responseTime: 2.5 },
];

export const infectionReportMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/infection-report-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "infection-report-mgmt:read");
      if (denied) return denied;
      return json(ok({
        infectionReportTimelyRate: computeInfectionReportTimelyRateV13(records),
        infectionMissedReportRate: computeInfectionMissedReportRateV13(records),
        infectionOutbreakResponseTime: computeInfectionOutbreakResponseTimeV13(records),
      }));
    },
  },
];
