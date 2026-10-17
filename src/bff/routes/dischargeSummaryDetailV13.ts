/**
 * 健澜科技 jlmedaios - 出院小结管理（细节）V13 路由（M427-A，detail 避让旧版 dischargeSummaryMgmtV13（M411））
 *
 * GET /api/v1/discharge-summary-detail
 *
 * 权限：discharge-summary-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDischargeSummaryCompleteRateV13,
  computeDischargeSummaryPassRateV13,
  computeDischargeSummaryTimelyRateV13,
  type DischargeSummaryDetailRecordV13,
} from "../aggregators/dischargeSummaryDetailV13Aggregator.js";

const records: DischargeSummaryDetailRecordV13[] = [
  { completeDs: 980, timelyDs: 950, passDs: 990, dischargeTotal: 1000 },
  { completeDs: 980, timelyDs: 950, passDs: 990, dischargeTotal: 1000 },
];

export const dischargeSummaryDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/discharge-summary-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "discharge-summary-detail:read");
      if (denied) return denied;
      return json(ok({
        dischargeSummaryCompleteRate: computeDischargeSummaryCompleteRateV13(records),
        dischargeSummaryTimelyRate: computeDischargeSummaryTimelyRateV13(records),
        dischargeSummaryPassRate: computeDischargeSummaryPassRateV13(records),
      }));
    },
  },
];
