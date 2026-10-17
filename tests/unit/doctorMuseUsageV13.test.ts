/**
 * 健澜科技 jlmedaios - Doctor MUSE 使用统计 V13 单测（M319-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  classifyScenarioDistributionV13,
  computeDeptCallCountV13,
  computeDoctorCallCountV13,
  type MuseUsageV13,
} from "../../src/bff/aggregators/doctorMuseUsageV13Aggregator";
import { doctorMuseUsageV13Routes } from "../../src/bff/routes/doctorMuseUsageV13";

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

describe("computeDoctorCallCountV13", () => {
  // 算式：D01 调用 = u1+u2+u3+u4 = 4
  it("D01 调用 = 4", () => {
    expect(computeDoctorCallCountV13(usages, "D01")).toBe(4);
  });
  it("空态 → 0", () => {
    expect(computeDoctorCallCountV13([], "D01")).toBe(0);
  });
});

describe("computeDeptCallCountV13", () => {
  // 算式：cardio 调用 = u1-u6 = 6
  it("cardio 调用 = 6", () => {
    expect(computeDeptCallCountV13(usages, "cardio")).toBe(6);
  });
});

describe("classifyScenarioDistributionV13", () => {
  // 算式：diagnosis = u1+u2+u5+u7+u10 = 5
  // medication = u3+u4+u8 = 3
  // sop = u6+u9 = 2
  it("diagnosis=5, medication=3, sop=2", () => {
    const d = classifyScenarioDistributionV13(usages);
    expect(d.diagnosis).toBe(5);
    expect(d.medication).toBe(3);
    expect(d.sop).toBe(2);
  });
});

describe("doctorMuseUsageV13Routes 读路由", () => {
  it("GET /api/v1/doctor-muse-usage 路由存在且 auth:true", () => {
    const route = doctorMuseUsageV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/doctor-muse-usage",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
