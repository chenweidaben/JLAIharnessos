/**
 * 健澜科技 jlmedaios - 医疗废物 V13 单测（M393-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeHandoverRegistrationRateV13,
  computeMedicalWasteClassificationRateV13,
  computeTemporaryStorageDisinfectionRateV13,
  type MedicalWasteMgmtRecordV13,
} from "../../src/bff/aggregators/medicalWasteMgmtV13Aggregator";
import { medicalWasteMgmtV13Routes } from "../../src/bff/routes/medicalWasteMgmtV13";

const records: MedicalWasteMgmtRecordV13[] = [
  { correctCount: 950, totalCount: 1000, registeredCount: 980, registeredShouldCount: 1000, disinfectedCount: 900, disinfectedShouldCount: 1000 },
  { correctCount: 950, totalCount: 1000, registeredCount: 980, registeredShouldCount: 1000, disinfectedCount: 900, disinfectedShouldCount: 1000 },
];

describe("computeMedicalWasteClassificationRateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("医疗废物分类率 = 95.00%", () => {
    expect(computeMedicalWasteClassificationRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeMedicalWasteClassificationRateV13([])).toBe(0);
  });
});

describe("computeHandoverRegistrationRateV13", () => {
  // 算式：(980+980)/(1000+1000) = 1960/2000×100 = 98.00
  it("交接登记率 = 98.00%", () => {
    expect(computeHandoverRegistrationRateV13(records)).toBe(98.00);
  });
});

describe("computeTemporaryStorageDisinfectionRateV13", () => {
  // 算式：(900+900)/(1000+1000) = 1800/2000×100 = 90.00
  it("暂存点消毒率 = 90.00%", () => {
    expect(computeTemporaryStorageDisinfectionRateV13(records)).toBe(90.00);
  });
});

describe("medicalWasteMgmtV13Routes 读路由", () => {
  it("GET /api/v1/medical-waste-mgmt 路由存在且 auth:true", () => {
    const route = medicalWasteMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/medical-waste-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
