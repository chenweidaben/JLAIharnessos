/**
 * 健澜科技 jlmedaios - 患者满意度（得分）V13 单测（M365-A，stats/score避让）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeInpatientSatisfactionScoreV13,
  computeOutpatientSatisfactionScoreV13,
  computeOverallSatisfactionV13,
  type PatientSatisfactionScoreRecordV13,
} from "../../src/bff/aggregators/patientSatisfactionScoreV13Aggregator";
import { patientSatisfactionScoreV13Routes } from "../../src/bff/routes/patientSatisfactionScoreV13";

const records: PatientSatisfactionScoreRecordV13[] = [
  { overallSatisfaction: 95, outpatientSatisfaction: 96, inpatientSatisfaction: 94 },
  { overallSatisfaction: 97, outpatientSatisfaction: 98, inpatientSatisfaction: 96 },
];

describe("computeOverallSatisfactionV13", () => {
  // 算式：(95+97)/2 = 96.00
  it("总体满意度 = 96.00", () => {
    expect(computeOverallSatisfactionV13(records)).toBe(96.00);
  });
  it("空态 → 0", () => {
    expect(computeOverallSatisfactionV13([])).toBe(0);
  });
});

describe("computeOutpatientSatisfactionScoreV13", () => {
  // 算式：(96+98)/2 = 97.00
  it("门诊满意度 = 97.00", () => {
    expect(computeOutpatientSatisfactionScoreV13(records)).toBe(97.00);
  });
});

describe("computeInpatientSatisfactionScoreV13", () => {
  // 算式：(94+96)/2 = 95.00
  it("住院满意度 = 95.00", () => {
    expect(computeInpatientSatisfactionScoreV13(records)).toBe(95.00);
  });
});

describe("patientSatisfactionScoreV13Routes 读路由", () => {
  it("GET /api/v1/patient-satisfaction-score 路由存在且 auth:true", () => {
    const route = patientSatisfactionScoreV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/patient-satisfaction-score",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
