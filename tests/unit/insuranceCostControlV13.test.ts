/**
 * 健澜科技 jlmedaios - 医保费用管控 V13 单测（M445-A，医保物价与费用管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeInsuranceCostControlRateV13,
  computeInsuranceCostGrowthControlRateV13,
  computeInsuranceCostRejectionRateV13,
  type InsuranceCostControlRecordV13,
} from "../../src/bff/aggregators/insuranceCostControlV13Aggregator";
import { insuranceCostControlV13Routes } from "../../src/bff/routes/insuranceCostControlV13";

const records: InsuranceCostControlRecordV13[] = [
  { avgActualCost: 950, avgTargetCost: 1000, rejectionAmount: 50, settlementTotal: 10000, actualGrowth: 95, targetGrowth: 100 },
  { avgActualCost: 950, avgTargetCost: 1000, rejectionAmount: 50, settlementTotal: 10000, actualGrowth: 95, targetGrowth: 100 },
];

describe("computeInsuranceCostControlRateV13", () => {
  // 算式：(1 - (950+950)/(1000+1000))×100 = (1 - 0.95)×100 = 5.00（正向，越高越好）
  it("医保次均费用控制率 = 5.00%（正向，越高越好）", () => {
    expect(computeInsuranceCostControlRateV13(records)).toBe(5.00);
  });
  it("空态 → 0", () => {
    expect(computeInsuranceCostControlRateV13([])).toBe(0);
  });
});

describe("computeInsuranceCostRejectionRateV13", () => {
  // 算式：(50+50)/(10000+10000)×100 = 100/20000×100 = 0.50（反向，越低越好）
  it("医保拒付率 = 0.50%（反向，越低越好）", () => {
    expect(computeInsuranceCostRejectionRateV13(records)).toBe(0.50);
  });
});

describe("computeInsuranceCostGrowthControlRateV13", () => {
  // 算式：(1 - (95+95)/(100+100))×100 = (1 - 0.95)×100 = 5.00（正向，越高越好）
  it("医保费用增幅控制率 = 5.00%（正向，越高越好）", () => {
    expect(computeInsuranceCostGrowthControlRateV13(records)).toBe(5.00);
  });
});

describe("insuranceCostControlV13Routes 读路由", () => {
  it("GET /api/v1/insurance-cost-control 路由存在且 auth:true", () => {
    const route = insuranceCostControlV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/insurance-cost-control",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
