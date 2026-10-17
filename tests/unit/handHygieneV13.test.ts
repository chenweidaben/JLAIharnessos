/**
 * 健澜科技 jlmedaios - 手卫生依从率 V13 单测（M341-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeCompliantCountV13,
  computeComplianceRateV13,
  computeObservationCountV13,
  type HandHygieneRecordV13,
} from "../../src/bff/aggregators/handHygieneV13Aggregator";
import { handHygieneV13Routes } from "../../src/bff/routes/handHygieneV13";

const records: HandHygieneRecordV13[] = [
  { observationCount: 200, compliantCount: 180 },
];

describe("computeObservationCountV13", () => {
  // 算式：200 = 200
  it("观察次数 = 200", () => {
    expect(computeObservationCountV13(records)).toBe(200);
  });
  it("空态 → 0", () => {
    expect(computeObservationCountV13([])).toBe(0);
  });
});

describe("computeCompliantCountV13", () => {
  // 算式：180 = 180
  it("合格次数 = 180", () => {
    expect(computeCompliantCountV13(records)).toBe(180);
  });
});

describe("computeComplianceRateV13", () => {
  // 算式：180/200×100 = 90.0
  it("依从率 = 90.0%", () => {
    expect(computeComplianceRateV13(records)).toBe(90.0);
  });
});

describe("handHygieneV13Routes 读路由", () => {
  it("GET /api/v1/hand-hygiene 路由存在且 auth:true", () => {
    const route = handHygieneV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/hand-hygiene",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
