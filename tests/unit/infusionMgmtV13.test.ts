/**
 * 健澜科技 jlmedaios - 输液管理 V13 单测（M359-D，M359 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeInfusionReactionRateV13,
  computeInpatientAntibioticInfusionRateV13,
  computeOutpatientInfusionRateV13,
  type InfusionMgmtRecordV13,
} from "../../src/bff/aggregators/infusionMgmtV13Aggregator";
import { infusionMgmtV13Routes } from "../../src/bff/routes/infusionMgmtV13";

const records: InfusionMgmtRecordV13[] = [
  { outpatientInfusionCount: 500, outpatientVisits: 10000, inpatientAntibioticInfusion: 200, inpatientAntibioticUse: 400, infusionReaction: 1, infusionTotal: 500 },
  { outpatientInfusionCount: 500, outpatientVisits: 10000, inpatientAntibioticInfusion: 200, inpatientAntibioticUse: 400, infusionReaction: 1, infusionTotal: 500 },
];

describe("computeOutpatientInfusionRateV13", () => {
  // 算式：(500+500)/(10000+10000) = 1000/20000×100 = 5.00
  it("门诊输液率 = 5.00%", () => {
    expect(computeOutpatientInfusionRateV13(records)).toBe(5.00);
  });
  it("空态 → 0", () => {
    expect(computeOutpatientInfusionRateV13([])).toBe(0);
  });
});

describe("computeInpatientAntibioticInfusionRateV13", () => {
  // 算式：(200+200)/(400+400) = 400/800×100 = 50.00
  it("住院抗菌药物输液率 = 50.00%", () => {
    expect(computeInpatientAntibioticInfusionRateV13(records)).toBe(50.00);
  });
});

describe("computeInfusionReactionRateV13", () => {
  // 算式：(1+1)/(500+500) = 2/1000×100 = 0.20
  it("输液反应发生率 = 0.20%", () => {
    expect(computeInfusionReactionRateV13(records)).toBe(0.20);
  });
});

describe("infusionMgmtV13Routes 读路由", () => {
  it("GET /api/v1/infusion-mgmt 路由存在且 auth:true", () => {
    const route = infusionMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/infusion-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
