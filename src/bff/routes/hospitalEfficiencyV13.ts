/**
 * 健澜科技 jlmedaios - 医院运营效率 V13 路由（M322-D）
 *
 * GET /api/v1/hospital-efficiency
 *
 * 权限：hospital-efficiency:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeInpatientTurnoverDaysV13,
  computeOutpatientWaitTimeV13,
  computeReportTimelinessRateV13,
  type InpatientStayV13,
  type OutpatientWaitV13,
  type ReportItemV13,
} from "../aggregators/hospitalEfficiencyV13Aggregator.js";

const outpatientData: OutpatientWaitV13[] = [
  { recordId: "o1", waitMinutes: 15 },
  { recordId: "o2", waitMinutes: 20 },
  { recordId: "o3", waitMinutes: 10 },
  { recordId: "o4", waitMinutes: 25 },
  { recordId: "o5", waitMinutes: 30 },
];

const inpatientData: InpatientStayV13[] = [
  { recordId: "i1", stayDays: 5 },
  { recordId: "i2", stayDays: 6 },
  { recordId: "i3", stayDays: 4 },
  { recordId: "i4", stayDays: 7 },
  { recordId: "i5", stayDays: 8 },
];

const reports: ReportItemV13[] = [
  { reportId: "r1", isTimely: true },
  { reportId: "r2", isTimely: true },
  { reportId: "r3", isTimely: true },
  { reportId: "r4", isTimely: true },
  { reportId: "r5", isTimely: true },
  { reportId: "r6", isTimely: true },
  { reportId: "r7", isTimely: true },
  { reportId: "r8", isTimely: true },
  { reportId: "r9", isTimely: true },
  { reportId: "r10", isTimely: false },
];

export const hospitalEfficiencyV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/hospital-efficiency",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "hospital-efficiency:read");
      if (denied) return denied;
      return json(ok({
        outpatientWaitMinutes: computeOutpatientWaitTimeV13(outpatientData),
        inpatientTurnoverDays: computeInpatientTurnoverDaysV13(inpatientData),
        reportTimelinessRate: computeReportTimelinessRateV13(reports),
      }));
    },
  },
];
