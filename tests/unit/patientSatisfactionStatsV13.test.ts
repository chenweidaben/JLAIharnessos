/**
 * 健澜科技 jlmedaios - 患者满意度 V13 单测（M347-A，stats 避让已有 patientSatisfactionV13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeInpatientSatisfactionV13,
  computeOutpatientSatisfactionV13,
  type PatientSatisfactionRecordV13,
} from "../../src/bff/aggregators/patientSatisfactionStatsV13Aggregator";
import { patientSatisfactionStatsV13Routes } from "../../src/bff/routes/patientSatisfactionStatsV13";

const records: PatientSatisfactionRecordV13[] = [
  { outpatientScore: 4.5, inpatientScore: 4.4 },
  { outpatientScore: 4.6, inpatientScore: 4.5 },
  { outpatientScore: 4.7, inpatientScore: 4.6 },
];

describe("computeOutpatientSatisfactionV13", () => {
  // 算式：(4.5+4.6+4.7)/3 = 13.8/3 = 4.60
  it("门诊满意度均分 = 4.60", () => {
    expect(computeOutpatientSatisfactionV13(records)).toBe(4.60);
  });
  it("空态 → 0", () => {
    expect(computeOutpatientSatisfactionV13([])).toBe(0);
  });
});

describe("computeInpatientSatisfactionV13", () => {
  // 算式：(4.4+4.5+4.6)/3 = 13.5/3 = 4.50
  it("住院满意度均分 = 4.50", () => {
    expect(computeInpatientSatisfactionV13(records)).toBe(4.50);
  });
  // 边界：空数组 → 0
  it("空数组边界 → 0", () => {
    expect(computeInpatientSatisfactionV13([])).toBe(0);
  });
});

describe("patientSatisfactionStatsV13Routes 读路由", () => {
  it("GET /api/v1/patient-satisfaction-stats 路由存在且 auth:true", () => {
    const route = patientSatisfactionStatsV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/patient-satisfaction-stats",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
