/**
 * 健澜科技 jlmedaios - 运营成本管理 V13 单测（M407-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeHundredYuanMedicalRevenueMaterialCostV13,
  computeManagementExpenseRatioV13,
  computePersonnelExpenditureRatioV13,
  type OperatingCostMgmtRecordV13,
} from "../../src/bff/aggregators/operatingCostMgmtV13Aggregator";
import { operatingCostMgmtV13Routes } from "../../src/bff/routes/operatingCostMgmtV13";

const records: OperatingCostMgmtRecordV13[] = [
  { materialCost: 200, medicalRevenue: 1000, personnelExp: 300, totalExp: 1000, mgmtExp: 100 },
  { materialCost: 200, medicalRevenue: 1000, personnelExp: 300, totalExp: 1000, mgmtExp: 100 },
];

describe("computeHundredYuanMedicalRevenueMaterialCostV13", () => {
  // 算式：(200+200)/(1000+1000)×100 = 400/2000×100 = 20.00
  it("百元医疗收入卫生材料费 = 20.00 元", () => {
    expect(computeHundredYuanMedicalRevenueMaterialCostV13(records)).toBe(20.00);
  });
  it("空态 → 0", () => {
    expect(computeHundredYuanMedicalRevenueMaterialCostV13([])).toBe(0);
  });
});

describe("computePersonnelExpenditureRatioV13", () => {
  // 算式：(300+300)/(1000+1000)×100 = 600/2000×100 = 30.00
  it("人员支出占比 = 30.00%", () => {
    expect(computePersonnelExpenditureRatioV13(records)).toBe(30.00);
  });
});

describe("computeManagementExpenseRatioV13", () => {
  // 算式：(100+100)/(1000+1000)×100 = 200/2000×100 = 10.00
  it("管理费用占比 = 10.00%", () => {
    expect(computeManagementExpenseRatioV13(records)).toBe(10.00);
  });
});

describe("operatingCostMgmtV13Routes 读路由", () => {
  it("GET /api/v1/operating-cost-mgmt 路由存在且 auth:true", () => {
    const route = operatingCostMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/operating-cost-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
