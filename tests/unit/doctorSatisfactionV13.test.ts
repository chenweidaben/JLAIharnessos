/**
 * 健澜科技 jlmedaios - 医生满意度调研 V13 单测（M332-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDoctorSatisfactionV13,
  type DoctorSatisfactionSurveyV13,
} from "../../src/bff/aggregators/doctorSatisfactionV13Aggregator";
import { doctorSatisfactionV13Routes } from "../../src/bff/routes/doctorSatisfactionV13";

const surveys: DoctorSatisfactionSurveyV13[] = [
  { salary: 3, workPressure: 4, careerDevelopment: 3 },
  { salary: 4, workPressure: 3, careerDevelopment: 4 },
  { salary: 5, workPressure: 4, careerDevelopment: 4 },
];

describe("computeDoctorSatisfactionV13", () => {
  // 算式：薪酬 (3+4+5)/3=4.0 / 工作压力 (4+3+4)/3≈3.7 / 职业发展 (3+4+4)/3≈3.7
  it("薪酬 = 4.0", () => {
    const dims = computeDoctorSatisfactionV13(surveys);
    expect(dims.length).toBe(3);
    expect(dims[0].dimension).toBe("薪酬");
    expect(dims[0].score).toBe(4.0);
  });
  it("工作压力 ≈ 3.7", () => {
    const dims = computeDoctorSatisfactionV13(surveys);
    expect(dims[1].dimension).toBe("工作压力");
    expect(dims[1].score).toBe(3.7);
  });
  it("空态 → []", () => {
    expect(computeDoctorSatisfactionV13([]).length).toBe(0);
  });
});

describe("doctorSatisfactionV13Routes 读路由", () => {
  it("GET /api/v1/doctor-satisfaction 路由存在且 auth:true", () => {
    const route = doctorSatisfactionV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/doctor-satisfaction",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
