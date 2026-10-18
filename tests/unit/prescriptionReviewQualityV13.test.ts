/**
 * 健澜科技 jlmedaios - 处方点评质量管理 V13 单测（M440-A，药事管理与药学服务组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computePrescriptionReviewInterventionRateV13,
  computePrescriptionReviewRationalRateV13,
  computePrescriptionReviewRateV13,
  type PrescriptionReviewQualityRecordV13,
} from "../../src/bff/aggregators/prescriptionReviewQualityV13Aggregator";
import { prescriptionReviewQualityV13Routes } from "../../src/bff/routes/prescriptionReviewQualityV13";

const records: PrescriptionReviewQualityRecordV13[] = [
  { reviewedPrescription: 950, sampledPrescription: 1000, rationalPrescription: 900, reviewedTotal: 1000, intervenedUnqualified: 950, totalUnqualified: 1000 },
  { reviewedPrescription: 950, sampledPrescription: 1000, rationalPrescription: 900, reviewedTotal: 1000, intervenedUnqualified: 950, totalUnqualified: 1000 },
];

describe("computePrescriptionReviewRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("处方点评率 = 95.00%", () => {
    expect(computePrescriptionReviewRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computePrescriptionReviewRateV13([])).toBe(0);
  });
});

describe("computePrescriptionReviewRationalRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("合理处方率 = 90.00%", () => {
    expect(computePrescriptionReviewRationalRateV13(records)).toBe(90.00);
  });
});

describe("computePrescriptionReviewInterventionRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("不合格处方干预率 = 95.00%", () => {
    expect(computePrescriptionReviewInterventionRateV13(records)).toBe(95.00);
  });
});

describe("prescriptionReviewQualityV13Routes 读路由", () => {
  it("GET /api/v1/prescription-review-quality 路由存在且 auth:true", () => {
    const route = prescriptionReviewQualityV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/prescription-review-quality",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
