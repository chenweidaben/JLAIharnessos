/**
 * 健澜科技 jlmedaios - 药事质量管理 V13 单测（M431-A，-quality 后缀避让旧版 pharmacyDetailV13（M418））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeMedicationInventoryTurnoverRateV13,
  computeMedicationInventoryVarianceRateV13,
  computeMedicationPrescriptionPassRateV13,
  type MedicationQualityMgmtRecordV13,
} from "../../src/bff/aggregators/medicationQualityMgmtV13Aggregator";
import { medicationQualityMgmtV13Routes } from "../../src/bff/routes/medicationQualityMgmtV13";

const records: MedicationQualityMgmtRecordV13[] = [
  { prescriptionPass: 980, prescriptionTotal: 1000, totalCost: 120000, avgInventory: 20000, varianceVarieties: 5, totalVarieties: 1000 },
  { prescriptionPass: 980, prescriptionTotal: 1000, totalCost: 120000, avgInventory: 20000, varianceVarieties: 5, totalVarieties: 1000 },
];

describe("computeMedicationPrescriptionPassRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("处方合格率 = 98.00%", () => {
    expect(computeMedicationPrescriptionPassRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeMedicationPrescriptionPassRateV13([])).toBe(0);
  });
});

describe("computeMedicationInventoryTurnoverRateV13", () => {
  // 算式：(120000+120000)/(20000+20000) = 240000/40000 = 6.00 次（比值类，不是%）
  it("药品库存周转率 = 6.00 次（比值类，越高越好）", () => {
    expect(computeMedicationInventoryTurnoverRateV13(records)).toBe(6.00);
  });
});

describe("computeMedicationInventoryVarianceRateV13", () => {
  // 算式：(5+5)/(1000+1000)×100 = 10/2000×100 = 0.50%（反向指标）
  it("药品盘点差异率 = 0.50%（反向指标）", () => {
    expect(computeMedicationInventoryVarianceRateV13(records)).toBe(0.50);
  });
});

describe("medicationQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/medication-quality-mgmt 路由存在且 auth:true", () => {
    const route = medicationQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/medication-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
