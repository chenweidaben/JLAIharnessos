/**
 * 健澜科技 jlmedaios - 药事管理（细节）V13 单测（M418-A，detail 避让旧版 prescriptionReview/drugCatalog/drugDelivery/drugSafety）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDrugRecallComplianceRateV13,
  computeDrugSupplyTimelyRateV13,
  computePrescriptionReviewPassRateV13,
  type PharmacyMgmtDetailRecordV13,
} from "../../src/bff/aggregators/pharmacyMgmtDetailV13Aggregator";
import { pharmacyMgmtDetailV13Routes } from "../../src/bff/routes/pharmacyMgmtDetailV13";

const records: PharmacyMgmtDetailRecordV13[] = [
  { reviewQualified: 950, reviewTotal: 1000, supplyTimely: 980, supplyTotal: 1000, recallCompliant: 99, recallTotal: 100 },
  { reviewQualified: 950, reviewTotal: 1000, supplyTimely: 980, supplyTotal: 1000, recallCompliant: 99, recallTotal: 100 },
];

describe("computePrescriptionReviewPassRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("处方点评合格率 = 95.00%", () => {
    expect(computePrescriptionReviewPassRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computePrescriptionReviewPassRateV13([])).toBe(0);
  });
});

describe("computeDrugSupplyTimelyRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("药品供应及时率 = 98.00%", () => {
    expect(computeDrugSupplyTimelyRateV13(records)).toBe(98.00);
  });
});

describe("computeDrugRecallComplianceRateV13", () => {
  // 算式：(99+99)/(100+100)×100 = 198/200×100 = 99.00
  it("药品召回合规率 = 99.00%", () => {
    expect(computeDrugRecallComplianceRateV13(records)).toBe(99.00);
  });
});

describe("pharmacyMgmtDetailV13Routes 读路由", () => {
  it("GET /api/v1/pharmacy-mgmt-detail 路由存在且 auth:true", () => {
    const route = pharmacyMgmtDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/pharmacy-mgmt-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
