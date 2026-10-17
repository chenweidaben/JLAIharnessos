/**
 * 健澜科技 jlmedaios - 影像质量 V13 单测（M360-B，新规格）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeGradeAFilmRateV13,
  computeImagingPositiveRateV13,
  computeImagingReportTimelyRateV13,
  type ImagingQualityRecordV13,
} from "../../src/bff/aggregators/imagingQualityV13Aggregator";
import { imagingQualityV13Routes } from "../../src/bff/routes/imagingQualityV13";

const records: ImagingQualityRecordV13[] = [
  { reportTimely: 950, reportCount: 1000, positiveCount: 300, examCount: 1000, gradeAFilm: 480, totalFilm: 500 },
  { reportTimely: 940, reportCount: 1000, positiveCount: 300, examCount: 1000, gradeAFilm: 470, totalFilm: 500 },
];

describe("computeImagingReportTimelyRateV13", () => {
  // 算式：(950+940)/(1000+1000) = 1890/2000×100 = 94.50
  it("影像报告及时率 = 94.50%", () => {
    expect(computeImagingReportTimelyRateV13(records)).toBe(94.50);
  });
  it("空态 → 0", () => {
    expect(computeImagingReportTimelyRateV13([])).toBe(0);
  });
});

describe("computeImagingPositiveRateV13", () => {
  // 算式：(300+300)/(1000+1000) = 600/2000×100 = 30.00
  it("检查阳性率 = 30.00%", () => {
    expect(computeImagingPositiveRateV13(records)).toBe(30.00);
  });
});

describe("computeGradeAFilmRateV13", () => {
  // 算式：(480+470)/(500+500) = 950/1000×100 = 95.00
  it("甲级片率 = 95.00%", () => {
    expect(computeGradeAFilmRateV13(records)).toBe(95.00);
  });
});

describe("imagingQualityV13Routes 读路由", () => {
  it("GET /api/v1/imaging-quality 路由存在且 auth:true", () => {
    const route = imagingQualityV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/imaging-quality",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
