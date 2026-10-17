/**
 * 健澜科技 jlmedaios - 门诊病历书写合格率 V13 路由（M340-D）
 *
 * GET /api/v1/outpatient-record
 *
 * 权限：outpatient-record:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeOutpatientRecordPassRateV13,
  type OutpatientRecordV13,
} from "../aggregators/outpatientRecordV13Aggregator.js";

const records: OutpatientRecordV13[] = [
  { totalChecked: 100, passCount: 95 },
];

export const outpatientRecordV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/outpatient-record",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "outpatient-record:read");
      if (denied) return denied;
      return json(ok({
        passRate: computeOutpatientRecordPassRateV13(records),
      }));
    },
  },
];
