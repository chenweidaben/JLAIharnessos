/**
 * 健澜科技 jlmedaios - 门诊收费管理 V13 路由（M448-A，财务与收费管理组）
 *
 * GET /api/v1/outpatient-billing-mgmt
 *
 * 权限：outpatient-billing-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeOutpatientBillingAccuracyRateV13,
  computeOutpatientBillingRefundRateV13,
  computeOutpatientBillingResponseMinutesV13,
  type OutpatientBillingMgmtRecordV13,
} from "../aggregators/outpatientBillingMgmtV13Aggregator.js";

const records: OutpatientBillingMgmtRecordV13[] = [
  { accurate: 950, refund: 30, total: 1000, avgResponseMinutes: 2.5 },
  { accurate: 950, refund: 30, total: 1000, avgResponseMinutes: 2.5 },
];

export const outpatientBillingMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/outpatient-billing-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "outpatient-billing-mgmt:read");
      if (denied) return denied;
      return json(ok({
        outpatientBillingAccuracyRate: computeOutpatientBillingAccuracyRateV13(records),
        outpatientBillingRefundRate: computeOutpatientBillingRefundRateV13(records),
        outpatientBillingResponseMinutes: computeOutpatientBillingResponseMinutesV13(records),
      }));
    },
  },
];
