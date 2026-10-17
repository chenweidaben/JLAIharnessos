/**
 * 健澜科技 jlmedaios - 影像质量 V13 单测（M374-D，M374 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeRadiologyDiagnosisConsistencyRateV13,
  computeRadiologyGradeAFilmRateV13,
  computeRadiologyReportTimelyRateV13,
  type RadiologyQualityRecordV13,
} from "../../src/bff/aggregators/radiologyQualityV13Aggregator";
import { radiologyQualityV13Routes } from "../../src/bff/routes/radiologyQualityV13";

const records: RadiologyQualityRecordV13[] = [
  { totalFilmCount: 100, gradeAFilmCount: 95, diagnosisSample: 100, diagnosisPass: 98, totalReportCount: 100, timelyReportCount: 99 },
  { totalFilmCount: 100, gradeAFilmCount: 95, diagnosisSample: 100, diagnosisPass: 98, totalReportCount: 100, timelyReportCount: 99 },
];

describe("computeRadiologyGradeAFilmRateV13", () => {
  // 算式：(95+95)/(100+100) = 190/200×100 = 95.00
  it("影像甲级片率 = 95.00%", () => {
    expect(computeRadiologyGradeAFilmRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeRadiologyGradeAFilmRateV13([])).toBe(0);
  });
});

describe("computeRadiologyDiagnosisConsistencyRateV13", () => {
  // 算式：(98+98)/(100+100) = 196/200×100 = 98.00
  it("影像诊断符合率 = 98.00%", () => {
    expect(computeRadiologyDiagnosisConsistencyRateV13(records)).toBe(98.00);
  });
});

describe("computeRadiologyReportTimelyRateV13", () => {
  // 算式：(99+99)/(100+100) = 198/200×100 = 99.00
  it("影像报告及时率 = 99.00%", () => {
    expect(computeRadiologyReportTimelyRateV13(records)).toBe(99.00);
  });
});

describe("radiologyQualityV13Routes 读路由", () => {
  it("GET /api/v1/radiology-quality 路由存在且 auth:true", () => {
    const route = radiologyQualityV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/radiology-quality",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
