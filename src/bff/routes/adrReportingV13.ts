/**
 * 健澜科技 jlmedaios - 药品不良反应监测 V13 路由（M440-C，药事管理与药学服务组）
 *
 * GET /api/v1/adr-reporting
 *
 * 权限：adr-reporting:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAdrReportingCountV13,
  computeAdrReportingDisposalTimelinessRateV13,
  computeAdrReportingSeriousRateV13,
  type AdrReportingRecordV13,
} from "../aggregators/adrReportingV13Aggregator.js";

const records: AdrReportingRecordV13[] = [
  { seriousAdr: 50, totalAdr: 1000, timelyDisposal: 950 },
  { seriousAdr: 50, totalAdr: 1000, timelyDisposal: 950 },
];

export const adrReportingV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/adr-reporting",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "adr-reporting:read");
      if (denied) return denied;
      return json(ok({
        adrReportingCount: computeAdrReportingCountV13(records),
        adrReportingSeriousRate: computeAdrReportingSeriousRateV13(records),
        adrReportingDisposalTimelinessRate: computeAdrReportingDisposalTimelinessRateV13(records),
      }));
    },
  },
];
