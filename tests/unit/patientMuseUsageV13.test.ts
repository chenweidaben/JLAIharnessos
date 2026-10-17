/**
 * 健澜科技 jlmedaios - 患者个人智能体使用统计 V13 单测（M320-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  classifyPatientScenariosV13,
  computeNextDayRetentionV13,
  computePatientMonthlyActiveV13,
  type PatientMuseUsageV13,
} from "../../src/bff/aggregators/patientMuseUsageV13Aggregator";
import { patientMuseUsageV13Routes } from "../../src/bff/routes/patientMuseUsageV13";

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

describe("computePatientMonthlyActiveV13", () => {
  // 算式：10 个不同 patientId → 月活 = 10
  it("monthlyActive = 10", () => {
    expect(computePatientMonthlyActiveV13(usages)).toBe(10);
  });
  it("空态 → 0", () => {
    expect(computePatientMonthlyActiveV13([])).toBe(0);
  });
});

describe("classifyPatientScenariosV13", () => {
  // 算式：healthReminder = u1-u4 = 4
  // medicationConsult = u5-u7 = 3
  // reportInterpret = u8-u9 = 2
  // appointment = u10 = 1
  it("healthReminder=4, medicationConsult=3, reportInterpret=2, appointment=1", () => {
    const d = classifyPatientScenariosV13(usages);
    expect(d.healthReminder).toBe(4);
    expect(d.medicationConsult).toBe(3);
    expect(d.reportInterpret).toBe(2);
    expect(d.appointment).toBe(1);
  });
});

describe("computeNextDayRetentionV13", () => {
  // 算式：isNextDayReturned=true = u1+u2+u3+u4+u5+u6+u8 = 7
  // retention = 7/10×100 = 70
  it("nextDayRetention = 70", () => {
    expect(computeNextDayRetentionV13(usages)).toBe(70);
  });
});

describe("patientMuseUsageV13Routes 读路由", () => {
  it("GET /api/v1/patient-muse-usage 路由存在且 auth:true", () => {
    const route = patientMuseUsageV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/patient-muse-usage",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
