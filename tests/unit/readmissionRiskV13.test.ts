/**
 * 健澜科技 jlmedaios - 31 天再入院风险预测 V13 单测（M314-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  classifyReadmissionRiskV13,
  computeReadmissionRiskScoreV13,
  identifyHighRiskPatientsV13,
  type ReadmissionPatientV13,
} from "../../src/bff/aggregators/readmissionRiskV13Aggregator";
import { readmissionRiskV13Routes } from "../../src/bff/routes/readmissionRiskV13";

const patients: ReadmissionPatientV13[] = [
  { patientId: "p1", age: 65, comorbidityCount: 3, losDays: 5 },
  { patientId: "p2", age: 40, comorbidityCount: 1, losDays: 3 },
];

describe("computeReadmissionRiskScoreV13", () => {
  // 算式：p1 年龄 65×0.5=32.5 + 合并症 3×10=30 + 住院 5×2=10 → 72.5 → round=73
  it("p1 = 73", () => {
    expect(computeReadmissionRiskScoreV13(patients[0])).toBe(73);
  });
  // 算式：p2 年龄 40×0.5=20 + 合并症 1×10=10 + 住院 3×2=6 → 36 → round=36
  it("p2 = 36", () => {
    expect(computeReadmissionRiskScoreV13(patients[1])).toBe(36);
  });
});

describe("classifyReadmissionRiskV13", () => {
  // 算式：73 ≥ 70 → 高
  it("73 → 高", () => {
    expect(classifyReadmissionRiskV13(73)).toBe("高");
  });
  // 算式：50 在 40-70 → 中
  it("50 → 中", () => {
    expect(classifyReadmissionRiskV13(50)).toBe("中");
  });
  // 算式：36 < 40 → 低
  it("36 → 低", () => {
    expect(classifyReadmissionRiskV13(36)).toBe("低");
  });
});

describe("identifyHighRiskPatientsV13", () => {
  // 算式：p1 score=73 ≥ 70 → 高风险；p2 score=36 < 70 → 不高风险
  it("高风险 = [p1]", () => {
    expect(identifyHighRiskPatientsV13(patients).map((p) => p.patientId)).toEqual(["p1"]);
  });
  it("空态 → []", () => {
    expect(identifyHighRiskPatientsV13([]).length).toBe(0);
  });
});

describe("readmissionRiskV13Routes 读路由", () => {
  it("GET /api/v1/readmission-risk 路由存在且 auth:true", () => {
    const route = readmissionRiskV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/readmission-risk",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
