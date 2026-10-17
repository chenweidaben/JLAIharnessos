/**
 * 健澜科技 jlmedaios - 患者满意度调研 V13 单测（M332-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  classifyComplaintReasonsV13,
  computeDimensionScoresV13,
  computeOverallScoreV13,
  type PatientSurveyV13,
} from "../../src/bff/aggregators/patientSatisfactionV13Aggregator";
import { patientSatisfactionV13Routes } from "../../src/bff/routes/patientSatisfactionV13";

const surveys: PatientSurveyV13[] = [
  { overallScore: 4, medicalTech: 4, serviceAttitude: 5, environment: 4, waitTime: 3, complaintReason: "等待时间长" },
  { overallScore: 5, medicalTech: 5, serviceAttitude: 4, environment: 5, waitTime: 4, complaintReason: "" },
  { overallScore: 3, medicalTech: 3, serviceAttitude: 3, environment: 4, waitTime: 2, complaintReason: "等待时间长" },
  { overallScore: 4, medicalTech: 4, serviceAttitude: 4, environment: 3, waitTime: 4, complaintReason: "就医环境" },
  { overallScore: 4, medicalTech: 4, serviceAttitude: 5, environment: 4, waitTime: 4, complaintReason: "" },
];

describe("computeOverallScoreV13", () => {
  // 算式：(4+5+3+4+4)/5 = 20/5 = 4.0
  it("总体评分 = 4.0", () => {
    expect(computeOverallScoreV13(surveys)).toBe(4.0);
  });
  it("空态 → 0", () => {
    expect(computeOverallScoreV13([])).toBe(0);
  });
});

describe("computeDimensionScoresV13", () => {
  // 算式：医疗技术 (4+5+3+4+4)/5=4.0 / 服务态度 (5+4+3+4+5)/5=4.2
  it("医疗技术 = 4.0", () => {
    const dims = computeDimensionScoresV13(surveys);
    expect(dims.length).toBe(4);
    expect(dims[0].dimension).toBe("医疗技术");
    expect(dims[0].score).toBe(4.0);
  });
  it("服务态度 = 4.2", () => {
    const dims = computeDimensionScoresV13(surveys);
    expect(dims[1].dimension).toBe("服务态度");
    expect(dims[1].score).toBe(4.2);
  });
});

describe("classifyComplaintReasonsV13", () => {
  // 算式：等待时间长 2 人 / 就医环境 1 人
  it("不满意原因分布 = 2 项", () => {
    const reasons = classifyComplaintReasonsV13(surveys);
    expect(reasons.length).toBe(2);
    expect(reasons[0].reason).toBe("等待时间长");
    expect(reasons[0].count).toBe(2);
  });
});

describe("patientSatisfactionV13Routes 读路由", () => {
  it("GET /api/v1/patient-satisfaction-survey 路由存在且 auth:true", () => {
    const route = patientSatisfactionV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/patient-satisfaction-survey",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
