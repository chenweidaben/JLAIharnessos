/**
 * 健澜科技 jlmedaios - 医学影像管理（细节）V13 单测（M415-B，detail 避让旧版 imagingTurnaroundV13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeImagingDataArchivingRateV13,
  computeImagingEquipmentUptimeRateV13,
  computeImagingReportDiagnosisMatchRateV13,
  type MedicalImagingDetailRecordV13,
} from "../../src/bff/aggregators/medicalImagingDetailV13Aggregator";
import { medicalImagingDetailV13Routes } from "../../src/bff/routes/medicalImagingDetailV13";

const records: MedicalImagingDetailRecordV13[] = [
  { match: 950, reportTotal: 1000, uptime: 960, shouldUptimeTotal: 1000, archived: 990, shouldArchiveTotal: 1000 },
  { match: 950, reportTotal: 1000, uptime: 960, shouldUptimeTotal: 1000, archived: 990, shouldArchiveTotal: 1000 },
];

describe("computeImagingReportDiagnosisMatchRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("影像报告诊断符合率 = 95.00%", () => {
    expect(computeImagingReportDiagnosisMatchRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeImagingReportDiagnosisMatchRateV13([])).toBe(0);
  });
});

describe("computeImagingEquipmentUptimeRateV13", () => {
  // 算式：(960+960)/(1000+1000)×100 = 1920/2000×100 = 96.00
  it("影像设备开机率 = 96.00%", () => {
    expect(computeImagingEquipmentUptimeRateV13(records)).toBe(96.00);
  });
});

describe("computeImagingDataArchivingRateV13", () => {
  // 算式：(990+990)/(1000+1000)×100 = 1980/2000×100 = 99.00
  it("影像资料归档率 = 99.00%", () => {
    expect(computeImagingDataArchivingRateV13(records)).toBe(99.00);
  });
});

describe("medicalImagingDetailV13Routes 读路由", () => {
  it("GET /api/v1/medical-imaging-detail 路由存在且 auth:true", () => {
    const route = medicalImagingDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/medical-imaging-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
