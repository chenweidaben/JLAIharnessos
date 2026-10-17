/**
 * 健澜科技 jlmedaios - 患者投诉处理 V13 路由（M326-B）
 *
 * GET /api/v1/patient-complaint
 *
 * 权限：patient-complaint:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  classifyComplaintByTypeV13,
  computeTimelinessRateV13,
  countMonthlyComplaintsV13,
  type ComplaintRecordV13,
} from "../aggregators/patientComplaintV13Aggregator.js";

const complaints: ComplaintRecordV13[] = [
  { type: "attitude", isTimely: true },
  { type: "attitude", isTimely: true },
  { type: "attitude", isTimely: false },
  { type: "process", isTimely: true },
  { type: "process", isTimely: true },
  { type: "process", isTimely: false },
  { type: "fee", isTimely: true },
  { type: "fee", isTimely: true },
  { type: "quality", isTimely: true },
  { type: "quality", isTimely: false },
];

export const patientComplaintV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/patient-complaint",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "patient-complaint:read");
      if (denied) return denied;
      return json(ok({
        monthlyComplaints: countMonthlyComplaintsV13(complaints),
        timelinessRate: computeTimelinessRateV13(complaints),
        typeDistribution: classifyComplaintByTypeV13(complaints),
      }));
    },
  },
];
