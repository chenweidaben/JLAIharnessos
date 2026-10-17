/**
 * 健澜科技 jlmedaios - 医生个人月度成长报告 V13 路由（M310-C）
 *
 * GET /api/v1/doctor-growth-report?doctorId=&month=
 *
 * 权限：doctor-growth-report:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildMonthlyGrowthReportV13,
  computeMoMGrowthV13,
  identifyGrowthMilestoneV13,
} from "../aggregators/doctorGrowthReportV13Aggregator.js";

export const doctorGrowthReportV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/doctor-growth-report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "doctor-growth-report:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const doctorId = url.searchParams.get("doctorId") ?? "d1";
      const month = url.searchParams.get("month") ?? "2026-10";
      const report = buildMonthlyGrowthReportV13(doctorId, month, {
        tasksDone: 12,
        suggestionsAdopted: 8,
        sopReferences: 5,
        badgeDelta: 1,
      });
      const momGrowth = computeMoMGrowthV13(70, 50);
      return json(ok({
        report,
        momGrowth,
        milestone: identifyGrowthMilestoneV13(momGrowth),
      }));
    },
  },
];
