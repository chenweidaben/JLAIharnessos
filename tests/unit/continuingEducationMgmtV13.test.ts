/**
 * 健澜科技 jlmedaios - 继续医学教育 V13 单测（M443-B，教学科研与继续教育管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeContinuingEducationCreditComplianceRateV13,
  computeContinuingEducationNationalProjectRateV13,
  computeContinuingEducationProvincialProjectRateV13,
  type ContinuingEducationMgmtRecordV13,
} from "../../src/bff/aggregators/continuingEducationMgmtV13Aggregator";
import { continuingEducationMgmtV13Routes } from "../../src/bff/routes/continuingEducationMgmtV13";

const records: ContinuingEducationMgmtRecordV13[] = [
  { creditCompliant: 950, shouldComplete: 1000, nationalProjectParticipated: 900, shouldParticipate: 1000, provincialProjectParticipated: 980 },
  { creditCompliant: 950, shouldComplete: 1000, nationalProjectParticipated: 900, shouldParticipate: 1000, provincialProjectParticipated: 980 },
];

describe("computeContinuingEducationCreditComplianceRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("学分达标率 = 95.00%", () => {
    expect(computeContinuingEducationCreditComplianceRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeContinuingEducationCreditComplianceRateV13([])).toBe(0);
  });
});

describe("computeContinuingEducationNationalProjectRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("国家级项目参与率 = 90.00%", () => {
    expect(computeContinuingEducationNationalProjectRateV13(records)).toBe(90.00);
  });
});

describe("computeContinuingEducationProvincialProjectRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("省级项目参与率 = 98.00%", () => {
    expect(computeContinuingEducationProvincialProjectRateV13(records)).toBe(98.00);
  });
});

describe("continuingEducationMgmtV13Routes 读路由", () => {
  it("GET /api/v1/continuing-education-mgmt 路由存在且 auth:true", () => {
    const route = continuingEducationMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/continuing-education-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
