/**
 * 健澜科技 jlmedaios - 交接班管理 V13 路由（M387-B）
 *
 * GET /api/v1/handover-mgmt
 *
 * 权限：handover-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeCriticalPatientBedsideHandoverRateV13,
  computeHandoverExecutionRateV13,
  computeHandoverOmissionRateV13,
  type HandoverMgmtRecordV13,
} from "../aggregators/handoverMgmtV13Aggregator.js";

const records: HandoverMgmtRecordV13[] = [
  { executedCount: 950, shouldCount: 1000, bedsideCount: 900, criticalPatientCount: 1000, omissionCount: 20, handoverCount: 1000 },
  { executedCount: 950, shouldCount: 1000, bedsideCount: 900, criticalPatientCount: 1000, omissionCount: 20, handoverCount: 1000 },
];

export const handoverMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/handover-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "handover-mgmt:read");
      if (denied) return denied;
      return json(ok({
        handoverExecutionRate: computeHandoverExecutionRateV13(records),
        criticalPatientBedsideHandoverRate: computeCriticalPatientBedsideHandoverRateV13(records),
        handoverOmissionRate: computeHandoverOmissionRateV13(records),
      }));
    },
  },
];
