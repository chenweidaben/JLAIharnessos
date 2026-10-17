/**
 * 健澜科技 jlmedaios - 住院床日成本 V13 单测（M317-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeCostCompositionV13,
  computeDeptBedDayCostV13,
  flagAbnormalBedDayCostV13,
  type InpatientAdmitV13,
} from "../../src/bff/aggregators/inpatientBedDayCostV13Aggregator";
import { inpatientBedDayCostV13Routes } from "../../src/bff/routes/inpatientBedDayCostV13";

const admits: InpatientAdmitV13[] = [
  { admitId: "a1", dept: "cardio", bedDays: 5, materialCost: 1500, drugCost: 3000, examCost: 1500, otherCost: 1500 },
  { admitId: "a2", dept: "cardio", bedDays: 5, materialCost: 1500, drugCost: 3000, examCost: 1500, otherCost: 1500 },
];

describe("computeDeptBedDayCostV13", () => {
  // 算式：cardio 总床日 = 5+5 = 10；总费用 = (1500+3000+1500+1500)×2 = 7500×2 = 15000
  // bedDayCost = 15000/10 = 1500
  it("cardio bedDayCost = 1500", () => {
    expect(computeDeptBedDayCostV13(admits, "cardio")).toBe(1500);
  });
  it("空态 → 0", () => {
    expect(computeDeptBedDayCostV13([], "cardio")).toBe(0);
  });
});

describe("computeCostCompositionV13", () => {
  // 算式：总费用 = 15000；耗材=3000, 药品=6000, 检查=3000, 其他=3000
  // material = 3000/15000×100 = 20
  // drug = 6000/15000×100 = 40
  // exam = 3000/15000×100 = 20
  // other = 3000/15000×100 = 20
  it("material=20, drug=40, exam=20, other=20", () => {
    const c = computeCostCompositionV13(admits);
    expect(c.material).toBe(20);
    expect(c.drug).toBe(40);
    expect(c.exam).toBe(20);
    expect(c.other).toBe(20);
  });
});

describe("flagAbnormalBedDayCostV13", () => {
  // 算式：2500 > 2000 → 红牌
  it("2500 > 2000 → 红牌", () => {
    expect(flagAbnormalBedDayCostV13(2500, 2000)).toBe(true);
  });
  // 算式：1500 < 2000 → 不红牌
  it("1500 < 2000 → 不红牌", () => {
    expect(flagAbnormalBedDayCostV13(1500, 2000)).toBe(false);
  });
});

describe("inpatientBedDayCostV13Routes 读路由", () => {
  it("GET /api/v1/inpatient-bed-day-cost 路由存在且 auth:true", () => {
    const route = inpatientBedDayCostV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/inpatient-bed-day-cost",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
