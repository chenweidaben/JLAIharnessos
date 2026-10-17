/**
 * 健澜科技 jlmedaios - 护患沟通 V13 单测（M405-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDischargeGuidelineAwarenessRateV13,
  computeHealthEducationCoverageRateV13,
  computeNursePatientCommunicationSatisfactionRateV13,
  type NursingCommunicationRecordV13,
} from "../../src/bff/aggregators/nursingCommunicationV13Aggregator";
import { nursingCommunicationV13Routes } from "../../src/bff/routes/nursingCommunicationV13";

const records: NursingCommunicationRecordV13[] = [
  { satisfied: 950, totalSurvey: 1000, covered: 980, shouldCover: 1000, aware: 900, totalAwareness: 1000 },
  { satisfied: 950, totalSurvey: 1000, covered: 980, shouldCover: 1000, aware: 900, totalAwareness: 1000 },
];

describe("computeNursePatientCommunicationSatisfactionRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("护患沟通满意度 = 95.00%", () => {
    expect(computeNursePatientCommunicationSatisfactionRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeNursePatientCommunicationSatisfactionRateV13([])).toBe(0);
  });
});

describe("computeHealthEducationCoverageRateV13", () => {
  // 算式：(980+980)/(1000+1000) = 1960/2000×100 = 98.00
  it("健康教育覆盖率 = 98.00%", () => {
    expect(computeHealthEducationCoverageRateV13(records)).toBe(98.00);
  });
});

describe("computeDischargeGuidelineAwarenessRateV13", () => {
  // 算式：(900+900)/(1000+1000) = 1800/2000×100 = 90.00
  it("出院指导知晓率 = 90.00%", () => {
    expect(computeDischargeGuidelineAwarenessRateV13(records)).toBe(90.00);
  });
});

describe("nursingCommunicationV13Routes 读路由", () => {
  it("GET /api/v1/nursing-communication 路由存在且 auth:true", () => {
    const route = nursingCommunicationV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/nursing-communication",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
