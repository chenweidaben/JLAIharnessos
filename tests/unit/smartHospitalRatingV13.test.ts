/**
 * 健澜科技 jlmedaios - 智慧医院评级自评 V13 单测（M323-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeMedicalServiceScoreV13,
  computeNursingMgmtScoreV13,
  computeSmartHospitalOverallV13,
  computeSmartMedicalScoreV13,
  type SmartHospitalAssessmentV13,
} from "../../src/bff/aggregators/smartHospitalRatingV13Aggregator";
import { smartHospitalRatingV13Routes } from "../../src/bff/routes/smartHospitalRatingV13";

const assessments: SmartHospitalAssessmentV13[] = [
  { dimension: "medicalService", score: 80 },
  { dimension: "medicalService", score: 82 },
  { dimension: "medicalService", score: 84 },
  { dimension: "nursingMgmt", score: 83 },
  { dimension: "nursingMgmt", score: 85 },
  { dimension: "nursingMgmt", score: 87 },
  { dimension: "smartMedical", score: 86 },
  { dimension: "smartMedical", score: 88 },
  { dimension: "smartMedical", score: 90 },
];

describe("computeMedicalServiceScoreV13", () => {
  // 算式：(80+82+84)/3 = 246/3 = 82
  it("medicalService = 82", () => {
    expect(computeMedicalServiceScoreV13(assessments)).toBe(82);
  });
  it("空态 → 0", () => {
    expect(computeMedicalServiceScoreV13([])).toBe(0);
  });
});

describe("computeNursingMgmtScoreV13", () => {
  // 算式：(83+85+87)/3 = 255/3 = 85
  it("nursingMgmt = 85", () => {
    expect(computeNursingMgmtScoreV13(assessments)).toBe(85);
  });
});

describe("computeSmartMedicalScoreV13", () => {
  // 算式：(86+88+90)/3 = 264/3 = 88
  it("smartMedical = 88", () => {
    expect(computeSmartMedicalScoreV13(assessments)).toBe(88);
  });
});

describe("computeSmartHospitalOverallV13", () => {
  // 算式：(82+85+88)/3 = 255/3 = 85
  it("overall = 85", () => {
    expect(computeSmartHospitalOverallV13(82, 85, 88)).toBe(85);
  });
  // 算式：≥85 达标
  it("85 → 达标", () => {
    expect(computeSmartHospitalOverallV13(82, 85, 88) >= 85).toBe(true);
  });
});

describe("smartHospitalRatingV13Routes 读路由", () => {
  it("GET /api/v1/smart-hospital-rating 路由存在且 auth:true", () => {
    const route = smartHospitalRatingV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/smart-hospital-rating",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
