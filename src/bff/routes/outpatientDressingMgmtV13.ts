/**
 * 健澜科技 jlmedaios - 门诊换药管理 V13 路由（M458-D，M458 收官，日间手术与门诊操作管理组）
 *
 * GET /api/v1/outpatient-dressing-mgmt
 *
 * 权限：outpatient-dressing-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeOutpatientDressingAverageMinutesV13,
  computeOutpatientDressingQualifiedRateV13,
  computeOutpatientDressingVisitCountV13,
  type OutpatientDressingMgmtRecordV13,
} from "../aggregators/outpatientDressingMgmtV13Aggregator.js";

const records: OutpatientDressingMgmtRecordV13[] = [
  { visitCount: 950, minutes: 15, qualified: 900, total: 1000 },
  { visitCount: 950, minutes: 15, qualified: 900, total: 1000 },
];

export const outpatientDressingMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/outpatient-dressing-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "outpatient-dressing-mgmt:read");
      if (denied) return denied;
      return json(ok({
        outpatientDressingVisitCount: computeOutpatientDressingVisitCountV13(records),
        outpatientDressingQualifiedRate: computeOutpatientDressingQualifiedRateV13(records),
        outpatientDressingAverageMinutes: computeOutpatientDressingAverageMinutesV13(records),
      }));
    },
  },
];
