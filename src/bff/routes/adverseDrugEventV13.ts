/**
 * 健澜科技 jlmedaios - 药品不良反应 V13 路由（M336-B）
 *
 * GET /api/v1/adverse-drug-event
 *
 * 权限：adverse-drug-event:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeADRTotalCountV13,
  computeSeriousADRRateV13,
  computeTimelyReportRateV13,
  type ADRRecordV13,
} from "../aggregators/adverseDrugEventV13Aggregator.js";

const records: ADRRecordV13[] = [
  { totalCount: 50, seriousCount: 5, timelyReportedCount: 45 },
];

export const adverseDrugEventV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/adverse-drug-event",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "adverse-drug-event:read");
      if (denied) return denied;
      return json(ok({
        totalCount: computeADRTotalCountV13(records),
        seriousRate: computeSeriousADRRateV13(records),
        timelyReportRate: computeTimelyReportRateV13(records),
      }));
    },
  },
];
