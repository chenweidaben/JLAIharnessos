/**
 * 健澜科技 jlmedaios - DRG 分组 V13 单测（M334-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeGroupingRateV13,
  computeHighWeightRateV13,
  computeLowWeightRateV13,
  type DRGRecordV13,
} from "../../src/bff/aggregators/drgGroupingV13Aggregator";
import { drgGroupingV13Routes } from "../../src/bff/routes/drgGroupingV13";

const records: DRGRecordV13[] = [
  { totalCases: 100, groupedCases: 95, lowWeightCases: 10, highWeightCases: 5 },
];

describe("computeGroupingRateV13", () => {
  // 算式：95/100×100 = 95
  it("入组率 = 95%", () => {
    expect(computeGroupingRateV13(records)).toBe(95);
  });
  it("空态 → 0", () => {
    expect(computeGroupingRateV13([])).toBe(0);
  });
});

describe("computeLowWeightRateV13", () => {
  // 算式：10/100×100 = 10
  it("低倍率占比 = 10%", () => {
    expect(computeLowWeightRateV13(records)).toBe(10);
  });
});

describe("computeHighWeightRateV13", () => {
  // 算式：5/100×100 = 5
  it("高倍率占比 = 5%", () => {
    expect(computeHighWeightRateV13(records)).toBe(5);
  });
});

describe("drgGroupingV13Routes 读路由", () => {
  it("GET /api/v1/drg-grouping 路由存在且 auth:true", () => {
    const route = drgGroupingV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/drg-grouping",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
