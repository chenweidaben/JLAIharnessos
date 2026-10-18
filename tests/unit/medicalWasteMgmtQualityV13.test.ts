/**
 * 健澜科技 jlmedaios - 医疗废物质量管理 V13 单测（M441-D，M441 收官，医院感染管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeMedicalWasteClassificationAccuracyRateV13,
  computeMedicalWasteHandoverComplianceRateV13,
  computeMedicalWasteStorageComplianceRateV13,
  type MedicalWasteMgmtQualityRecordV13,
} from "../../src/bff/aggregators/medicalWasteMgmtQualityV13Aggregator";
import { medicalWasteMgmtQualityV13Routes } from "../../src/bff/routes/medicalWasteMgmtQualityV13";

const records: MedicalWasteMgmtQualityRecordV13[] = [
  { classificationAccurate: 950, classificationTotal: 1000, handoverCompliant: 980, handoverTotal: 1000, storageCompliant: 900, storageTotal: 1000 },
  { classificationAccurate: 950, classificationTotal: 1000, handoverCompliant: 980, handoverTotal: 1000, storageCompliant: 900, storageTotal: 1000 },
];

describe("computeMedicalWasteClassificationAccuracyRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("医废分类准确率 = 95.00%", () => {
    expect(computeMedicalWasteClassificationAccuracyRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeMedicalWasteClassificationAccuracyRateV13([])).toBe(0);
  });
});

describe("computeMedicalWasteHandoverComplianceRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("医废交接规范率 = 98.00%", () => {
    expect(computeMedicalWasteHandoverComplianceRateV13(records)).toBe(98.00);
  });
});

describe("computeMedicalWasteStorageComplianceRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("医废暂存达标率 = 90.00%", () => {
    expect(computeMedicalWasteStorageComplianceRateV13(records)).toBe(90.00);
  });
});

describe("medicalWasteMgmtQualityV13Routes 读路由", () => {
  it("GET /api/v1/medical-waste-mgmt-quality 路由存在且 auth:true", () => {
    const route = medicalWasteMgmtQualityV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/medical-waste-mgmt-quality",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
