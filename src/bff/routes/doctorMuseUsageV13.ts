/**
 * 健澜科技 jlmedaios - Doctor MUSE 使用统计 V13 路由（M319-A）
 *
 * GET /api/v1/doctor-muse-usage?dept=
 *
 * 权限：doctor-muse-usage:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  classifyScenarioDistributionV13,
  computeDeptCallCountV13,
  computeDoctorCallCountV13,
  type MuseUsageV13,
} from "../aggregators/doctorMuseUsageV13Aggregator.js";

const usages: MuseUsageV13[] = [
  { usageId: "u1", doctorId: "D01", dept: "cardio", scenario: "diagnosis" },
  { usageId: "u2", doctorId: "D01", dept: "cardio", scenario: "diagnosis" },
  { usageId: "u3", doctorId: "D01", dept: "cardio", scenario: "medication" },
  { usageId: "u4", doctorId: "D01", dept: "cardio", scenario: "medication" },
  { usageId: "u5", doctorId: "D02", dept: "cardio", scenario: "diagnosis" },
  { usageId: "u6", doctorId: "D02", dept: "cardio", scenario: "sop" },
  { usageId: "u7", doctorId: "D03", dept: "ortho", scenario: "diagnosis" },
  { usageId: "u8", doctorId: "D03", dept: "ortho", scenario: "medication" },
  { usageId: "u9", doctorId: "D04", dept: "ortho", scenario: "sop" },
  { usageId: "u10", doctorId: "D04", dept: "ortho", scenario: "diagnosis" },
];

export const doctorMuseUsageV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/doctor-muse-usage",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "doctor-muse-usage:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const dept = url.searchParams.get("dept") ?? "cardio";
      return json(ok({
        dept,
        deptCallCount: computeDeptCallCountV13(usages, dept),
        doctorCallCounts: [
          { doctorId: "D01", count: computeDoctorCallCountV13(usages, "D01") },
          { doctorId: "D02", count: computeDoctorCallCountV13(usages, "D02") },
          { doctorId: "D03", count: computeDoctorCallCountV13(usages, "D03") },
          { doctorId: "D04", count: computeDoctorCallCountV13(usages, "D04") },
        ],
        scenarioDistribution: classifyScenarioDistributionV13(usages),
      }));
    },
  },
];
