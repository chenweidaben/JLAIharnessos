/**
 * 健澜科技 jlmedaios - 再入院管理 V13 路由（M411-B）
 *
 * GET /api/v1/readmission-mgmt
 *
 * 权限：readmission-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  compute15DayReadmissionRateV13,
  compute31DayReadmissionRateV13,
  computeReadmissionCauseAnalysisCompletionRateV13,
  type ReadmissionMgmtRecordV13,
} from "../aggregators/readmissionMgmtV13Aggregator.js";

const records: ReadmissionMgmtRecordV13[] = [
  { readmit31: 30, readmit15: 15, dischargeTotal: 1000, analyzed: 25, readmitTotal: 30 },
  { readmit31: 30, readmit15: 15, dischargeTotal: 1000, analyzed: 25, readmitTotal: 30 },
];

export const readmissionMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/readmission-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "readmission-mgmt:read");
      if (denied) return denied;
      return json(ok({
        day31ReadmissionRate: compute31DayReadmissionRateV13(records),
        day15ReadmissionRate: compute15DayReadmissionRateV13(records),
        readmissionCauseAnalysisCompletionRate: computeReadmissionCauseAnalysisCompletionRateV13(records),
      }));
    },
  },
];
