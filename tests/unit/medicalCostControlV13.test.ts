/**
 * 健澜科技 jlmedaios - 费用控制 V13 单测（M375-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDrugRatioV13,
  computeInpatientCostPerStayV13,
  computeOutpatientCostPerVisitV13,
  type MedicalCostControlRecordV13,
} from "../../src/bff/aggregators/medicalCostControlV13Aggregator";
import { medicalCostControlV13Routes } from "../../src/bff/routes/medicalCostControlV13";

const records: MedicalCostControlRecordV13[] = [
  { outpatientCostPerVisit: 150, inpatientCostPerStay: 5000, drugRevenue: 300000, medicalRevenue: 1000000 },
  { outpatientCostPerVisit: 150, inpatientCostPerStay: 5000, drugRevenue: 300000, medicalRevenue: 1000000 },
];

describe("computeOutpatientCostPerVisitV13", () => {
  // 算式：(150+150)/2 = 150.00
  it("次均门诊费用 = 150.00 元", () => {
    expect(computeOutpatientCostPerVisitV13(records)).toBe(150.00);
  });
  it("空态 → 0", () => {
    expect(computeOutpatientCostPerVisitV13([])).toBe(0);
  });
});

describe("computeInpatientCostPerStayV13", () => {
  // 算式：(5000+5000)/2 = 5000.00
  it("次均住院费用 = 5000.00 元", () => {
    expect(computeInpatientCostPerStayV13(records)).toBe(5000.00);
  });
});

describe("computeDrugRatioV13", () => {
  // 算式：(300000+300000)/(1000000+1000000) = 600000/2000000×100 = 30.00
  it("药占比 = 30.00%", () => {
    expect(computeDrugRatioV13(records)).toBe(30.00);
  });
});

describe("medicalCostControlV13Routes 读路由", () => {
  it("GET /api/v1/medical-cost-control 路由存在且 auth:true", () => {
    const route = medicalCostControlV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/medical-cost-control",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
