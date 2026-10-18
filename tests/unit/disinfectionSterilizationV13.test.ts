/**
 * 健澜科技 jlmedaios - 消毒灭菌管理 V13 单测（M441-C，医院感染管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDisinfectionQualifiedRateV13,
  computeEndoscopeDisinfectionQualifiedRateV13,
  computeSterilizationQualifiedRateV13,
  type DisinfectionSterilizationRecordV13,
} from "../../src/bff/aggregators/disinfectionSterilizationV13Aggregator";
import { disinfectionSterilizationV13Routes } from "../../src/bff/routes/disinfectionSterilizationV13";

const records: DisinfectionSterilizationRecordV13[] = [
  { disinfectionQualified: 950, disinfectionTotal: 1000, sterilizationQualified: 980, sterilizationTotal: 1000, endoscopeQualified: 900, endoscopeTotal: 1000 },
  { disinfectionQualified: 950, disinfectionTotal: 1000, sterilizationQualified: 980, sterilizationTotal: 1000, endoscopeQualified: 900, endoscopeTotal: 1000 },
];

describe("computeDisinfectionQualifiedRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("消毒合格率 = 95.00%", () => {
    expect(computeDisinfectionQualifiedRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeDisinfectionQualifiedRateV13([])).toBe(0);
  });
});

describe("computeSterilizationQualifiedRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("灭菌合格率 = 98.00%", () => {
    expect(computeSterilizationQualifiedRateV13(records)).toBe(98.00);
  });
});

describe("computeEndoscopeDisinfectionQualifiedRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("内镜清洗消毒合格率 = 90.00%", () => {
    expect(computeEndoscopeDisinfectionQualifiedRateV13(records)).toBe(90.00);
  });
});

describe("disinfectionSterilizationV13Routes 读路由", () => {
  it("GET /api/v1/disinfection-sterilization 路由存在且 auth:true", () => {
    const route = disinfectionSterilizationV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/disinfection-sterilization",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
