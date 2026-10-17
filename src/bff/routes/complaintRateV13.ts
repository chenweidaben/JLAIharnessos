/**
 * 健澜科技 jlmedaios - 投诉率 V13 路由（M347-B）
 *
 * GET /api/v1/complaint-rate
 *
 * 权限：complaint-rate:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDischargedPatientComplaintRateV13,
  computePerThousandInpatientDaysComplaintsV13,
  type ComplaintRecordV13,
} from "../aggregators/complaintRateV13Aggregator.js";

const records: ComplaintRecordV13[] = [
  { complaintCount: 1, dischargedCount: 500, inpatientDays: 1500 },
  { complaintCount: 2, dischargedCount: 500, inpatientDays: 1500 },
];

export const complaintRateV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/complaint-rate",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "complaint-rate:read");
      if (denied) return denied;
      return json(ok({
        dischargedRate: computeDischargedPatientComplaintRateV13(records),
        perThousandInpatientDays: computePerThousandInpatientDaysComplaintsV13(records),
      }));
    },
  },
];
