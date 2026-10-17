/**
 * 健澜科技 jlmedaios - 药耗占比 V13 单测（M356-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeConsumableRatioV13,
  computeDrugRatioV13,
  computeLabExamRatioV13,
  type DrugConsumableRatioRecordV13,
} from "../../src/bff/aggregators/drugConsumableRatioV13Aggregator";
import { drugConsumableRatioV13Routes } from "../../src/bff/routes/drugConsumableRatioV13";

const records: DrugConsumableRatioRecordV13[] = [
  { drugRevenue: 300, consumableRevenue: 150, labExamRevenue: 120, medicalRevenue: 1000 },
  { drugRevenue: 200, consumableRevenue: 150, labExamRevenue: 80, medicalRevenue: 1000 },
];

describe("computeDrugRatioV13", () => {
  // 算式：(300+200)/(1000+1000) = 500/2000×100 = 25.00
  it("药占比 = 25.00%", () => {
    expect(computeDrugRatioV13(records)).toBe(25.00);
  });
  it("空态 → 0", () => {
    expect(computeDrugRatioV13([])).toBe(0);
  });
});

describe("computeConsumableRatioV13", () => {
  // 算式：(150+150)/(1000+1000) = 300/2000×100 = 15.00
  it("耗占比 = 15.00%", () => {
    expect(computeConsumableRatioV13(records)).toBe(15.00);
  });
});

describe("computeLabExamRatioV13", () => {
  // 算式：(120+80)/(1000+1000) = 200/2000×100 = 10.00
  it("检查检验收入占比 = 10.00%", () => {
    expect(computeLabExamRatioV13(records)).toBe(10.00);
  });
});

describe("drugConsumableRatioV13Routes 读路由", () => {
  it("GET /api/v1/drug-consumable-ratio 路由存在且 auth:true", () => {
    const route = drugConsumableRatioV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/drug-consumable-ratio",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
