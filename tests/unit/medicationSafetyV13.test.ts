/**
 * 健澜科技 jlmedaios - 用药安全 V13 单测（M394-D，M394 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeHighAlertDrugMgmtRateV13,
  computeMedicationErrorRateV13,
  computeMedicationErrorReportRateV13,
  type MedicationSafetyRecordV13,
} from "../../src/bff/aggregators/medicationSafetyV13Aggregator";
import { medicationSafetyV13Routes } from "../../src/bff/routes/medicationSafetyV13";

const records: MedicationSafetyRecordV13[] = [
  { errorCount: 2, administrationCount: 1000, managedDrugCount: 90, highAlertDrugCount: 100, reportedCount: 1, totalErrorCount: 2 },
  { errorCount: 2, administrationCount: 1000, managedDrugCount: 90, highAlertDrugCount: 100, reportedCount: 1, totalErrorCount: 2 },
];

describe("computeMedicationErrorRateV13", () => {
  // 算式：(2+2)/(1000+1000)×100 = 4/2000×100 = 0.20
  it("用药差错率 = 0.20%", () => {
    expect(computeMedicationErrorRateV13(records)).toBe(0.20);
  });
  it("空态 → 0", () => {
    expect(computeMedicationErrorRateV13([])).toBe(0);
  });
});

describe("computeHighAlertDrugMgmtRateV13", () => {
  // 算式：(90+90)/(100+100) = 180/200×100 = 90.00
  it("高警示药品管理率 = 90.00%", () => {
    expect(computeHighAlertDrugMgmtRateV13(records)).toBe(90.00);
  });
});

describe("computeMedicationErrorReportRateV13", () => {
  // 算式：(1+1)/(2+2)×100 = 2/4×100 = 50.00
  it("给药错误上报率 = 50.00%", () => {
    expect(computeMedicationErrorReportRateV13(records)).toBe(50.00);
  });
});

describe("medicationSafetyV13Routes 读路由", () => {
  it("GET /api/v1/medication-safety 路由存在且 auth:true", () => {
    const route = medicationSafetyV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/medication-safety",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
