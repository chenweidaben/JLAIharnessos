/**
 * 健澜科技 jlmedaios - 影像质量管理 V13 单测（M430-A，-quality 后缀避让旧版 medicalImagingDetailV13（M415））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeImagingDiagnosisMatchRateV13,
  computeImagingExaminationPositiveRateV13,
  computeImagingReportPassRateV13,
  type ImagingQualityMgmtRecordV13,
} from "../../src/bff/aggregators/imagingQualityMgmtV13Aggregator";
import { imagingQualityMgmtV13Routes } from "../../src/bff/routes/imagingQualityMgmtV13";

const records: ImagingQualityMgmtRecordV13[] = [
  { reportPass: 980, reportTotal: 1000, diagnosisMatch: 950, comparisonTotal: 1000, positiveExam: 600, examTotal: 1000 },
  { reportPass: 980, reportTotal: 1000, diagnosisMatch: 950, comparisonTotal: 1000, positiveExam: 600, examTotal: 1000 },
];

describe("computeImagingReportPassRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("影像报告合格率 = 98.00%", () => {
    expect(computeImagingReportPassRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeImagingReportPassRateV13([])).toBe(0);
  });
});

describe("computeImagingDiagnosisMatchRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("影像诊断符合率 = 95.00%", () => {
    expect(computeImagingDiagnosisMatchRateV13(records)).toBe(95.00);
  });
});

describe("computeImagingExaminationPositiveRateV13", () => {
  // 算式：(600+600)/(1000+1000)×100 = 1200/2000×100 = 60.00
  it("影像检查阳性率 = 60.00%", () => {
    expect(computeImagingExaminationPositiveRateV13(records)).toBe(60.00);
  });
});

describe("imagingQualityMgmtV13Routes 读路由", () => {
  it("GET /api/v1/imaging-quality-mgmt 路由存在且 auth:true", () => {
    const route = imagingQualityMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/imaging-quality-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
