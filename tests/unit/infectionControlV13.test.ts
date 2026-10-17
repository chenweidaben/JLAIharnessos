/**
 * 健澜科技 jlmedaios - 院感控制 V13 单测（M370-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDisinfectionSterilizationPassRateV13,
  computeHandHygieneComplianceRateV13,
  computeInfectionRateV13,
  type InfectionControlRecordV13,
} from "../../src/bff/aggregators/infectionControlV13Aggregator";
import { infectionControlV13Routes } from "../../src/bff/routes/infectionControlV13";

const records: InfectionControlRecordV13[] = [
  { inpatientCount: 1000, infectionCount: 5, handHygieneShould: 1000, handHygieneDone: 900, disinfectionSample: 100, disinfectionPass: 98 },
  { inpatientCount: 1000, infectionCount: 5, handHygieneShould: 1000, handHygieneDone: 900, disinfectionSample: 100, disinfectionPass: 98 },
];

describe("computeInfectionRateV13", () => {
  // 算式：(5+5)/(1000+1000) = 10/2000×100 = 0.50
  it("院感发病率 = 0.50%", () => {
    expect(computeInfectionRateV13(records)).toBe(0.50);
  });
  it("空态 → 0", () => {
    expect(computeInfectionRateV13([])).toBe(0);
  });
});

describe("computeHandHygieneComplianceRateV13", () => {
  // 算式：(900+900)/(1000+1000) = 1800/2000×100 = 90.00
  it("手卫生依从率 = 90.00%", () => {
    expect(computeHandHygieneComplianceRateV13(records)).toBe(90.00);
  });
});

describe("computeDisinfectionSterilizationPassRateV13", () => {
  // 算式：(98+98)/(100+100) = 196/200×100 = 98.00
  it("消毒灭菌合格率 = 98.00%", () => {
    expect(computeDisinfectionSterilizationPassRateV13(records)).toBe(98.00);
  });
});

describe("infectionControlV13Routes 读路由", () => {
  it("GET /api/v1/infection-control 路由存在且 auth:true", () => {
    const route = infectionControlV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/infection-control",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
