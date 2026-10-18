/**
 * 健澜科技 jlmedaios - 采购质量管理 V13 单测（M435-B，-quality 后缀避让旧版采购模块（M408 consumableSupplyMgmtV13 等））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeProcurementComplianceRateV13,
  computeProcurementSavingRateV13,
  computeProcurementTimelinessRateV13,
  type ProcurementQualityMgmtRecordV13,
} from "../../src/bff/aggregators/procurementQualityMgmtV13Aggregator";
import { procurementQualityMgmtV13Routes } from "../../src/bff/routes/procurementQualityMgmtV13";

const records: ProcurementQualityMgmtRecordV13[] = [
  { timelyProcurement: 950, shouldProcurement: 1000, compliantProcurement: 980, totalProcurement: 1000, savingAmount: 100, budgetAmount: 1000 },
  { timelyProcurement: 950, shouldProcurement: 1000, compliantProcurement: 980, totalProcurement: 1000, savingAmount: 100, budgetAmount: 1000 },
];

describe("computeProcurementTimelinessRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("采购及时率 = 95.00%", () => {
    expect(computeProcurementTimelinessRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeProcurementTimelinessRateV13([])).toBe(0);
  });
});

describe("computeProcurementComplianceRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("采购合规率 = 98.00%", () => {
    expect(computeProcurementComplianceRateV13(records)).toBe(98.00);
  });
});

describe("computeProcurementSavingRateV13", () => {
  // 算式：(100+100)/(1000+1000)×100 = 200/2000×100 = 10.00（越高越好）
  it("采购节约率 = 10.00%（越高越好）", () => {
    expect(computeProcurementSavingRateV13(records)).toBe(10.00);
  });
});

describe("procurementQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/procurement-quality-mgmt 路由存在且 auth:true", () => {
    const route = procurementQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/procurement-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
