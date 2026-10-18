/**
 * 健澜科技 jlmedaios - 医疗设备采购管理 V13 单测（M449-A，医疗装备与设备管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeMedicalEquipmentPurchaseAcceptanceQualifiedRateV13,
  computeMedicalEquipmentPurchaseBiddingComplianceRateV13,
  computeMedicalEquipmentPurchasePlanCompletionRateV13,
  type MedicalEquipmentPurchaseMgmtRecordV13,
} from "../../src/bff/aggregators/medicalEquipmentPurchaseMgmtV13Aggregator";
import { medicalEquipmentPurchaseMgmtV13Routes } from "../../src/bff/routes/medicalEquipmentPurchaseMgmtV13";

const records: MedicalEquipmentPurchaseMgmtRecordV13[] = [
  { completed: 950, planned: 1000, compliant: 900, totalBidding: 1000, qualified: 980, totalAcceptance: 1000 },
  { completed: 950, planned: 1000, compliant: 900, totalBidding: 1000, qualified: 980, totalAcceptance: 1000 },
];

describe("computeMedicalEquipmentPurchasePlanCompletionRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("采购计划完成率 = 95.00%", () => {
    expect(computeMedicalEquipmentPurchasePlanCompletionRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeMedicalEquipmentPurchasePlanCompletionRateV13([])).toBe(0);
  });
});

describe("computeMedicalEquipmentPurchaseBiddingComplianceRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("招标采购合规率 = 90.00%", () => {
    expect(computeMedicalEquipmentPurchaseBiddingComplianceRateV13(records)).toBe(90.00);
  });
});

describe("computeMedicalEquipmentPurchaseAcceptanceQualifiedRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("设备到货验收合格率 = 98.00%", () => {
    expect(computeMedicalEquipmentPurchaseAcceptanceQualifiedRateV13(records)).toBe(98.00);
  });
});

describe("medicalEquipmentPurchaseMgmtV13Routes 读路由", () => {
  it("GET /api/v1/medical-equipment-purchase-mgmt 路由存在且 auth:true", () => {
    const route = medicalEquipmentPurchaseMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/medical-equipment-purchase-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
