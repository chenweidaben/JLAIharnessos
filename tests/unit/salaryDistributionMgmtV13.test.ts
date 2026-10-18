/**
 * 健澜科技 jlmedaios - 薪酬分配管理 V13 单测（M444-B，绩效薪酬与人力资源管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeSalaryDistributionComplianceRateV13,
  computeSalaryDistributionSatisfactionRateV13,
  computeSalaryDistributionTimelinessRateV13,
  type SalaryDistributionMgmtRecordV13,
} from "../../src/bff/aggregators/salaryDistributionMgmtV13Aggregator";
import { salaryDistributionMgmtV13Routes } from "../../src/bff/routes/salaryDistributionMgmtV13";

const records: SalaryDistributionMgmtRecordV13[] = [
  { timelyPaid: 950, shouldPay: 1000, compliantPlan: 900, totalPlan: 1000, satisfiedStaff: 980, surveyedStaff: 1000 },
  { timelyPaid: 950, shouldPay: 1000, compliantPlan: 900, totalPlan: 1000, satisfiedStaff: 980, surveyedStaff: 1000 },
];

describe("computeSalaryDistributionTimelinessRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("绩效工资发放及时率 = 95.00%", () => {
    expect(computeSalaryDistributionTimelinessRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeSalaryDistributionTimelinessRateV13([])).toBe(0);
  });
});

describe("computeSalaryDistributionComplianceRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("分配方案合规率 = 90.00%", () => {
    expect(computeSalaryDistributionComplianceRateV13(records)).toBe(90.00);
  });
});

describe("computeSalaryDistributionSatisfactionRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("员工薪酬满意度 = 98.00%", () => {
    expect(computeSalaryDistributionSatisfactionRateV13(records)).toBe(98.00);
  });
});

describe("salaryDistributionMgmtV13Routes 读路由", () => {
  it("GET /api/v1/salary-distribution-mgmt 路由存在且 auth:true", () => {
    const route = salaryDistributionMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/salary-distribution-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
