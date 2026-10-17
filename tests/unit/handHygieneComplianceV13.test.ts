/**
 * 健澜科技 jlmedaios - 手卫生依从性 V13 单测（M318-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeHygieneComplianceRateV13,
  flagLowComplianceV13,
  groupByDeptV13,
  type HygieneObservationV13,
} from "../../src/bff/aggregators/handHygieneComplianceV13Aggregator";
import { handHygieneComplianceV13Routes } from "../../src/bff/routes/handHygieneComplianceV13";

const observations: HygieneObservationV13[] = [
  { observationId: "o1", dept: "cardio", isCompliant: true },
  { observationId: "o2", dept: "cardio", isCompliant: true },
  { observationId: "o3", dept: "cardio", isCompliant: true },
  { observationId: "o4", dept: "cardio", isCompliant: true },
  { observationId: "o5", dept: "cardio", isCompliant: true },
  { observationId: "o6", dept: "cardio", isCompliant: true },
  { observationId: "o7", dept: "cardio", isCompliant: true },
  { observationId: "o8", dept: "cardio", isCompliant: true },
  { observationId: "o9", dept: "cardio", isCompliant: false },
  { observationId: "o10", dept: "cardio", isCompliant: false },
  { observationId: "o11", dept: "icu", isCompliant: true },
  { observationId: "o12", dept: "icu", isCompliant: true },
  { observationId: "o13", dept: "icu", isCompliant: true },
  { observationId: "o14", dept: "icu", isCompliant: true },
  { observationId: "o15", dept: "icu", isCompliant: true },
  { observationId: "o16", dept: "icu", isCompliant: true },
  { observationId: "o17", dept: "icu", isCompliant: true },
  { observationId: "o18", dept: "icu", isCompliant: false },
  { observationId: "o19", dept: "icu", isCompliant: false },
  { observationId: "o20", dept: "icu", isCompliant: false },
];

describe("computeHygieneComplianceRateV13", () => {
  // 算式：20 观察中合格 = o1-o8 + o11-o17 = 8+7 = 15
  // compliance = 15/20×100 = 75
  it("overallRate = 75", () => {
    expect(computeHygieneComplianceRateV13(observations)).toBe(75);
  });
  it("空态 → 0", () => {
    expect(computeHygieneComplianceRateV13([])).toBe(0);
  });
});

describe("groupByDeptV13", () => {
  // 算式：cardio 10 观察中合格 = o1-o8 = 8 → 8/10×100 = 80
  // icu 10 观察中合格 = o11-o17 = 7 → 7/10×100 = 70
  it("cardio=80, icu=70", () => {
    const rates = groupByDeptV13(observations);
    expect(rates[0].dept).toBe("cardio");
    expect(rates[0].rate).toBe(80);
    expect(rates[1].dept).toBe("icu");
    expect(rates[1].rate).toBe(70);
  });
});

describe("flagLowComplianceV13", () => {
  // 算式：75 < 80 → 红牌
  it("75 < 80 → 红牌", () => {
    expect(flagLowComplianceV13(75, 80)).toBe(true);
  });
  // 算式：80 = 80 → 不红牌（不小于）
  it("80 = 80 → 不红牌", () => {
    expect(flagLowComplianceV13(80, 80)).toBe(false);
  });
});

describe("handHygieneComplianceV13Routes 读路由", () => {
  it("GET /api/v1/hand-hygiene-compliance 路由存在且 auth:true", () => {
    const route = handHygieneComplianceV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/hand-hygiene-compliance",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
