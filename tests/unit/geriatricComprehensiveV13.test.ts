/**
 * 健澜科技 jlmedaios - 老年综合评估 V13 单测（M350-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeCGACountV13,
  computeComprehensiveManagementRateV13,
  computeFallScreeningRateV13,
  type GeriatricComprehensiveRecordV13,
} from "../../src/bff/aggregators/geriatricComprehensiveV13Aggregator";
import { geriatricComprehensiveV13Routes } from "../../src/bff/routes/geriatricComprehensiveV13";

const records: GeriatricComprehensiveRecordV13[] = [
  { cgaCount: 30, fallScreenedCount: 80, geriatricVisits: 100, managedCount: 60 },
  { cgaCount: 30, fallScreenedCount: 80, geriatricVisits: 100, managedCount: 60 },
];

describe("computeCGACountV13", () => {
  // 算式：30+30 = 60
  it("CGA 评估数 = 60", () => {
    expect(computeCGACountV13(records)).toBe(60);
  });
  it("空态 → 0", () => {
    expect(computeCGACountV13([])).toBe(0);
  });
});

describe("computeFallScreeningRateV13", () => {
  // 算式：(80+80)/(100+100) = 160/200×100 = 80.00
  it("跌倒风险筛查率 = 80.00%", () => {
    expect(computeFallScreeningRateV13(records)).toBe(80.00);
  });
});

describe("computeComprehensiveManagementRateV13", () => {
  // 算式：(60+60)/(100+100) = 120/200×100 = 60.00
  it("老年综合管理率 = 60.00%", () => {
    expect(computeComprehensiveManagementRateV13(records)).toBe(60.00);
  });
});

describe("geriatricComprehensiveV13Routes 读路由", () => {
  it("GET /api/v1/geriatric-comprehensive 路由存在且 auth:true", () => {
    const route = geriatricComprehensiveV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/geriatric-comprehensive",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
