/**
 * 健澜科技 jlmedaios - 处方点评 V13 单测（M406-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeInappropriateMedicationPrescriptionRateV13,
  computePrescriptionReviewPassRateV13,
  computeUnreasonablePrescriptionRateV13,
  type PharmacyPrescriptionReviewRecordV13,
} from "../../src/bff/aggregators/pharmacyPrescriptionReviewV13Aggregator";
import { pharmacyPrescriptionReviewV13Routes } from "../../src/bff/routes/pharmacyPrescriptionReviewV13";

const records: PharmacyPrescriptionReviewRecordV13[] = [
  { reviewPass: 980, reviewTotal: 1000, unreasonable: 20, inappropriate: 10 },
  { reviewPass: 980, reviewTotal: 1000, unreasonable: 20, inappropriate: 10 },
];

describe("computePrescriptionReviewPassRateV13", () => {
  // 算式：(980+980)/(1000+1000) = 1960/2000×100 = 98.00
  it("处方点评合格率 = 98.00%", () => {
    expect(computePrescriptionReviewPassRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computePrescriptionReviewPassRateV13([])).toBe(0);
  });
});

describe("computeUnreasonablePrescriptionRateV13", () => {
  // 算式：(20+20)/(1000+1000) = 40/2000×100 = 2.00
  it("不合理处方率 = 2.00%", () => {
    expect(computeUnreasonablePrescriptionRateV13(records)).toBe(2.00);
  });
});

describe("computeInappropriateMedicationPrescriptionRateV13", () => {
  // 算式：(10+10)/(1000+1000) = 20/2000×100 = 1.00
  it("用药不适宜处方率 = 1.00%", () => {
    expect(computeInappropriateMedicationPrescriptionRateV13(records)).toBe(1.00);
  });
});

describe("pharmacyPrescriptionReviewV13Routes 读路由", () => {
  it("GET /api/v1/pharmacy-prescription-review 路由存在且 auth:true", () => {
    const route = pharmacyPrescriptionReviewV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/pharmacy-prescription-review",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
