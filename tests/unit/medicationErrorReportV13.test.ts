/**
 * 健澜科技 jlmedaios - 用药错误上报 V13 单测（M424-A，换名避让旧版 patientSafetyMgmtV13（M418））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeMedicationErrorMissingReportRateV13,
  computeMedicationErrorReportRateV13,
  computeMedicationErrorRootCauseAnalysisRateV13,
  type MedicationErrorReportRecordV13,
} from "../../src/bff/aggregators/medicationErrorReportV13Aggregator";
import { medicationErrorReportV13Routes } from "../../src/bff/routes/medicationErrorReportV13";

const records: MedicationErrorReportRecordV13[] = [
  { reported: 95, actualTotal: 100, missing: 5, rcaCompleted: 90, errorTotal: 100 },
  { reported: 95, actualTotal: 100, missing: 5, rcaCompleted: 90, errorTotal: 100 },
];

describe("computeMedicationErrorReportRateV13", () => {
  // 算式：(95+95)/(100+100)×100 = 190/200×100 = 95.00
  it("用药错误上报率 = 95.00%", () => {
    expect(computeMedicationErrorReportRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeMedicationErrorReportRateV13([])).toBe(0);
  });
});

describe("computeMedicationErrorMissingReportRateV13", () => {
  // 算式：(5+5)/(100+100)×100 = 10/200×100 = 5.00（反向指标，越低越好）
  it("用药错误漏报率 = 5.00%（反向指标）", () => {
    expect(computeMedicationErrorMissingReportRateV13(records)).toBe(5.00);
  });
});

describe("computeMedicationErrorRootCauseAnalysisRateV13", () => {
  // 算式：(90+90)/(100+100)×100 = 180/200×100 = 90.00
  it("用药错误根因分析完成率 = 90.00%", () => {
    expect(computeMedicationErrorRootCauseAnalysisRateV13(records)).toBe(90.00);
  });
});

describe("medicationErrorReportV13Routes 读路由", () => {
  it("GET /api/v1/medication-error-report 路由存在且 auth:true", () => {
    const route = medicationErrorReportV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/medication-error-report",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
