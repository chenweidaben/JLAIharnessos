/**
 * 健澜科技 jlmedaios - 出院小结管理 V13 路由（M411-D，M411 收官）
 *
 * GET /api/v1/discharge-summary-mgmt
 *
 * 权限：discharge-summary-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDischargeGuidanceCompletenessRateV13,
  computeDischargeSummaryPassRateV13,
  computeDischargeSummaryTimelyRateV13,
  type DischargeSummaryMgmtRecordV13,
} from "../aggregators/dischargeSummaryMgmtV13Aggregator.js";

const records: DischargeSummaryMgmtRecordV13[] = [
  { timely: 98, dischargeTotal: 1000, qualified: 980, summaryTotal: 1000, complete: 950, shouldTotal: 1000 },
  { timely: 98, dischargeTotal: 1000, qualified: 980, summaryTotal: 1000, complete: 950, shouldTotal: 1000 },
];

export const dischargeSummaryMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/discharge-summary-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "discharge-summary-mgmt:read");
      if (denied) return denied;
      return json(ok({
        dischargeSummaryTimelyRate: computeDischargeSummaryTimelyRateV13(records),
        dischargeSummaryPassRate: computeDischargeSummaryPassRateV13(records),
        dischargeGuidanceCompletenessRate: computeDischargeGuidanceCompletenessRateV13(records),
      }));
    },
  },
];
