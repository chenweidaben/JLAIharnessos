/**
 * 健澜科技 jlmedaios - 门诊等候时长 V13 路由（M337-A）
 *
 * GET /api/v1/outpatient-wait
 *
 * 权限：outpatient-wait:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computePaymentWaitV13,
  computePharmacyWaitV13,
  computeRegistrationWaitV13,
  computeTriageWaitV13,
  type OutpatientWaitRecordV13,
} from "../aggregators/outpatientWaitV13Aggregator.js";

const records: OutpatientWaitRecordV13[] = [
  { registrationWaitMinutes: 5, triageWaitMinutes: 10, paymentWaitMinutes: 3, pharmacyWaitMinutes: 4 },
  { registrationWaitMinutes: 10, triageWaitMinutes: 20, paymentWaitMinutes: 6, pharmacyWaitMinutes: 8 },
  { registrationWaitMinutes: 15, triageWaitMinutes: 30, paymentWaitMinutes: 9, pharmacyWaitMinutes: 12 },
];

export const outpatientWaitV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/outpatient-wait",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "outpatient-wait:read");
      if (denied) return denied;
      return json(ok({
        registrationWait: computeRegistrationWaitV13(records),
        triageWait: computeTriageWaitV13(records),
        paymentWait: computePaymentWaitV13(records),
        pharmacyWait: computePharmacyWaitV13(records),
      }));
    },
  },
];
