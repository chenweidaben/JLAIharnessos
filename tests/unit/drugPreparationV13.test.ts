/**
 * 健澜科技 jlmedaios - 制剂管理 V13 单测（M380-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeInhousePreparationVarietyCountV13,
  computeMonthlyPreparationOutputV13,
  computePreparationQualifiedRateV13,
  type DrugPreparationRecordV13,
} from "../../src/bff/aggregators/drugPreparationV13Aggregator";
import { drugPreparationV13Routes } from "../../src/bff/routes/drugPreparationV13";

const records: DrugPreparationRecordV13[] = [
  { preparationVarietyCount: 10, testBatchCount: 100, qualifiedBatchCount: 95, monthlyOutput: 5000 },
  { preparationVarietyCount: 10, testBatchCount: 100, qualifiedBatchCount: 95, monthlyOutput: 5000 },
];

describe("computeInhousePreparationVarietyCountV13", () => {
  // 算式：10+10 = 20
  it("院内制剂品种数 = 20 种", () => {
    expect(computeInhousePreparationVarietyCountV13(records)).toBe(20);
  });
  it("空态 → 0", () => {
    expect(computeInhousePreparationVarietyCountV13([])).toBe(0);
  });
});

describe("computePreparationQualifiedRateV13", () => {
  // 算式：(95+95)/(100+100) = 190/200×100 = 95.00
  it("制剂合格率 = 95.00%", () => {
    expect(computePreparationQualifiedRateV13(records)).toBe(95.00);
  });
});

describe("computeMonthlyPreparationOutputV13", () => {
  // 算式：5000+5000 = 10000
  it("制剂月产量 = 10000 瓶/袋", () => {
    expect(computeMonthlyPreparationOutputV13(records)).toBe(10000);
  });
});

describe("drugPreparationV13Routes 读路由", () => {
  it("GET /api/v1/drug-preparation 路由存在且 auth:true", () => {
    const route = drugPreparationV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/drug-preparation",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
