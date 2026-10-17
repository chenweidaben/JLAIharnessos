/**
 * 健澜科技 jlmedaios - 交接班管理（细节）V13 路由（M413-C，detail 避让旧版 handoverMgmtV13）
 *
 * GET /api/v1/handover-detail
 *
 * 权限：handover-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeBedsideHandoverExecutionRateV13,
  computeHandoverMissedItemRateV13,
  computeHandoverWritingCompletenessRateV13,
  type HandoverDetailRecordV13,
} from "../aggregators/handoverDetailV13Aggregator.js";

const records: HandoverDetailRecordV13[] = [
  { complete: 950, total: 1000, executed: 980, shouldTotal: 1000, missed: 10, handoverTotal: 1000 },
  { complete: 950, total: 1000, executed: 980, shouldTotal: 1000, missed: 10, handoverTotal: 1000 },
];

export const handoverDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/handover-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "handover-detail:read");
      if (denied) return denied;
      return json(ok({
        handoverWritingCompletenessRate: computeHandoverWritingCompletenessRateV13(records),
        bedsideHandoverExecutionRate: computeBedsideHandoverExecutionRateV13(records),
        handoverMissedItemRate: computeHandoverMissedItemRateV13(records),
      }));
    },
  },
];
