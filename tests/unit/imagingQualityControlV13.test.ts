/**
 * 健澜科技 jlmedaios - 影像质控 V13 单测（M392-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeImageGradeARateV13,
  computeImagingDiagnosisConcordanceRateV13,
  computeImagingReportTimelyRateV13,
  type ImagingQualityControlRecordV13,
} from "../../src/bff/aggregators/imagingQualityControlV13Aggregator";
import { imagingQualityControlV13Routes } from "../../src/bff/routes/imagingQualityControlV13";

const records: ImagingQualityControlRecordV13[] = [
  { gradeACount: 950, totalCount: 1000, concordanceCount: 900, diagnosisTotalCount: 1000, timelyCount: 980, reportTotalCount: 1000 },
  { gradeACount: 950, totalCount: 1000, concordanceCount: 900, diagnosisTotalCount: 1000, timelyCount: 980, reportTotalCount: 1000 },
];

describe("computeImageGradeARateV13", () => {
  // 算式：(950+950)/(1000+1000) = 1900/2000×100 = 95.00
  it("影像甲级片率 = 95.00%", () => {
    expect(computeImageGradeARateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeImageGradeARateV13([])).toBe(0);
  });
});

describe("computeImagingDiagnosisConcordanceRateV13", () => {
  // 算式：(900+900)/(1000+1000) = 1800/2000×100 = 90.00
  it("影像诊断符合率 = 90.00%", () => {
    expect(computeImagingDiagnosisConcordanceRateV13(records)).toBe(90.00);
  });
});

describe("computeImagingReportTimelyRateV13", () => {
  // 算式：(980+980)/(1000+1000) = 1960/2000×100 = 98.00
  it("影像报告及时率 = 98.00%", () => {
    expect(computeImagingReportTimelyRateV13(records)).toBe(98.00);
  });
});

describe("imagingQualityControlV13Routes 读路由", () => {
  it("GET /api/v1/imaging-quality-control 路由存在且 auth:true", () => {
    const route = imagingQualityControlV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/imaging-quality-control",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
