/**
 * 健澜科技 jlmedaios - 门诊次均费用 V13 路由（M317-A）
 *
 * GET /api/v1/outpatient-avg-cost?dept=
 *
 * 权限：outpatient-avg-cost:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDeptAvgCostV13,
  computeDoctorAvgCostV13,
  flagHighAvgCostV13,
  type OutpatientVisitV13,
} from "../aggregators/outpatientAvgCostV13Aggregator.js";

const visits: OutpatientVisitV13[] = [
  { visitId: "v1", dept: "cardio", doctorId: "D01", cost: 500 },
  { visitId: "v2", dept: "cardio", doctorId: "D01", cost: 500 },
  { visitId: "v3", dept: "cardio", doctorId: "D01", cost: 500 },
  { visitId: "v4", dept: "cardio", doctorId: "D01", cost: 500 },
  { visitId: "v5", dept: "cardio", doctorId: "D01", cost: 500 },
  { visitId: "v6", dept: "cardio", doctorId: "D02", cost: 700 },
  { visitId: "v7", dept: "cardio", doctorId: "D02", cost: 700 },
  { visitId: "v8", dept: "cardio", doctorId: "D02", cost: 700 },
  { visitId: "v9", dept: "cardio", doctorId: "D02", cost: 700 },
  { visitId: "v10", dept: "cardio", doctorId: "D02", cost: 700 },
];

export const outpatientAvgCostV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/outpatient-avg-cost",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "outpatient-avg-cost:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const dept = url.searchParams.get("dept") ?? "cardio";
      const threshold = 600;
      return json(ok({
        dept,
        threshold,
        deptAvg: computeDeptAvgCostV13(visits, dept),
        doctorAvgs: [
          { doctorId: "D01", avg: computeDoctorAvgCostV13(visits, "D01"), isHigh: flagHighAvgCostV13(computeDoctorAvgCostV13(visits, "D01"), threshold) },
          { doctorId: "D02", avg: computeDoctorAvgCostV13(visits, "D02"), isHigh: flagHighAvgCostV13(computeDoctorAvgCostV13(visits, "D02"), threshold) },
        ],
      }));
    },
  },
];
