/**
 * 健澜科技 jlmedaios - 患者个人智能体使用统计 V13 路由（M320-D）
 *
 * GET /api/v1/patient-muse-usage
 *
 * 权限：patient-muse-usage:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  classifyPatientScenariosV13,
  computeNextDayRetentionV13,
  computePatientMonthlyActiveV13,
  type PatientMuseUsageV13,
} from "../aggregators/patientMuseUsageV13Aggregator.js";

const usages: PatientMuseUsageV13[] = [
  { usageId: "u1", patientId: "p1", scenario: "healthReminder", isNextDayReturned: true },
  { usageId: "u2", patientId: "p2", scenario: "healthReminder", isNextDayReturned: true },
  { usageId: "u3", patientId: "p3", scenario: "healthReminder", isNextDayReturned: true },
  { usageId: "u4", patientId: "p4", scenario: "healthReminder", isNextDayReturned: true },
  { usageId: "u5", patientId: "p5", scenario: "medicationConsult", isNextDayReturned: true },
  { usageId: "u6", patientId: "p6", scenario: "medicationConsult", isNextDayReturned: true },
  { usageId: "u7", patientId: "p7", scenario: "medicationConsult", isNextDayReturned: false },
  { usageId: "u8", patientId: "p8", scenario: "reportInterpret", isNextDayReturned: true },
  { usageId: "u9", patientId: "p9", scenario: "reportInterpret", isNextDayReturned: false },
  { usageId: "u10", patientId: "p10", scenario: "appointment", isNextDayReturned: false },
];

export const patientMuseUsageV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/patient-muse-usage",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "patient-muse-usage:read");
      if (denied) return denied;
      return json(ok({
        monthlyActive: computePatientMonthlyActiveV13(usages),
        scenarioDistribution: classifyPatientScenariosV13(usages),
        nextDayRetention: computeNextDayRetentionV13(usages),
      }));
    },
  },
];
