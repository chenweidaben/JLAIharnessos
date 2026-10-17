/**
 * 健澜科技 jlmedaios - 单病种成本 V13 单测（M329-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeConsumableRatioV13,
  computeDrugRatioV13,
  computeTop5DiseaseCostV13,
  type DiseaseCostV13,
} from "../../src/bff/aggregators/costPerPatientV13Aggregator";
import { costPerPatientV13Routes } from "../../src/bff/routes/costPerPatientV13";

const diseases: DiseaseCostV13[] = [
  { diseaseName: "急性心梗", totalCost: 15000, drugCost: 4500, consumableCost: 3000 },
  { diseaseName: "脑卒中", totalCost: 12000, drugCost: 3600, consumableCost: 2400 },
  { diseaseName: "肺炎", totalCost: 8000, drugCost: 2400, consumableCost: 1600 },
  { diseaseName: "阑尾炎", totalCost: 5000, drugCost: 1500, consumableCost: 1000 },
  { diseaseName: "骨折", totalCost: 10000, drugCost: 3000, consumableCost: 2000 },
  { diseaseName: "糖尿病", totalCost: 6000, drugCost: 1800, consumableCost: 1200 },
];

const referenceDisease: DiseaseCostV13 = {
  diseaseName: "阑尾炎",
  totalCost: 5000,
  drugCost: 1500,
  consumableCost: 1000,
};

describe("computeTop5DiseaseCostV13", () => {
  // 算式：15000/12000/10000/8000/6000/5000 → Top5 前 5 个
  it("Top5 = 5 个病种", () => {
    const result = computeTop5DiseaseCostV13(diseases);
    expect(result.length).toBe(5);
    expect(result[0].diseaseName).toBe("急性心梗");
    expect(result[0].totalCost).toBe(15000);
  });
  it("空态 → []", () => {
    expect(computeTop5DiseaseCostV13([]).length).toBe(0);
  });
});

describe("computeDrugRatioV13", () => {
  // 算式：1500/5000×100 = 30
  it("药占比 = 30%", () => {
    expect(computeDrugRatioV13(referenceDisease)).toBe(30);
  });
});

describe("computeConsumableRatioV13", () => {
  // 算式：1000/5000×100 = 20
  it("耗占比 = 20%", () => {
    expect(computeConsumableRatioV13(referenceDisease)).toBe(20);
  });
});

describe("costPerPatientV13Routes 读路由", () => {
  it("GET /api/v1/cost-per-patient 路由存在且 auth:true", () => {
    const route = costPerPatientV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/cost-per-patient",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
