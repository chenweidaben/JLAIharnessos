/**
 * 健澜科技 jlmedaios - 合理用药 V13 单测（M359-B，stats 避让已有 rationalDrugUse）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAdjuvantDrugRevenueRatioV13,
  computeEssentialDrugCategoryRatioV13,
  computeNationalProcurementDrugRatioV13,
  type RationalDrugUseStatsRecordV13,
} from "../../src/bff/aggregators/rationalDrugUseStatsV13Aggregator";
import { rationalDrugUseStatsV13Routes } from "../../src/bff/routes/rationalDrugUseStatsV13";

const records: RationalDrugUseStatsRecordV13[] = [
  { essentialDrugCategory: 200, totalDrugCategory: 400, nationalProcurementEquipped: 90, nationalProcurementRequired: 100, adjuvantDrugRevenue: 50, totalDrugRevenue: 1000 },
  { essentialDrugCategory: 200, totalDrugCategory: 400, nationalProcurementEquipped: 90, nationalProcurementRequired: 100, adjuvantDrugRevenue: 50, totalDrugRevenue: 1000 },
];

describe("computeEssentialDrugCategoryRatioV13", () => {
  // 算式：(200+200)/(400+400) = 400/800×100 = 50.00
  it("基本药物品种占比 = 50.00%", () => {
    expect(computeEssentialDrugCategoryRatioV13(records)).toBe(50.00);
  });
  it("空态 → 0", () => {
    expect(computeEssentialDrugCategoryRatioV13([])).toBe(0);
  });
});

describe("computeNationalProcurementDrugRatioV13", () => {
  // 算式：(90+90)/(100+100) = 180/200×100 = 90.00
  it("国家集采药品配备率 = 90.00%", () => {
    expect(computeNationalProcurementDrugRatioV13(records)).toBe(90.00);
  });
});

describe("computeAdjuvantDrugRevenueRatioV13", () => {
  // 算式：(50+50)/(1000+1000) = 100/2000×100 = 5.00
  it("辅助用药收入占比 = 5.00%", () => {
    expect(computeAdjuvantDrugRevenueRatioV13(records)).toBe(5.00);
  });
});

describe("rationalDrugUseStatsV13Routes 读路由", () => {
  it("GET /api/v1/rational-drug-use-stats 路由存在且 auth:true", () => {
    const route = rationalDrugUseStatsV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/rational-drug-use-stats",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
