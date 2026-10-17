/**
 * 健澜科技 jlmedaios - 处方点评统计 V13 单测（M388-A，stats 避让）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeIrrationalPrescriptionRateV13,
  computePrescriptionReviewCountV13,
  computeSpecialPrescriptionReviewCountV13,
  type PrescriptionReviewRecordV13,
} from "../../src/bff/aggregators/prescriptionReviewStatsV13Aggregator";
import { prescriptionReviewStatsV13Routes } from "../../src/bff/routes/prescriptionReviewStatsV13";

const records: PrescriptionReviewRecordV13[] = [
  { reviewCount: 1000, irrationalCount: 50, specialReviewCount: 100 },
  { reviewCount: 1000, irrationalCount: 50, specialReviewCount: 100 },
];

describe("computePrescriptionReviewCountV13", () => {
  // 算式：1000+1000 = 2000
  it("处方点评数 = 2000 张", () => {
    expect(computePrescriptionReviewCountV13(records)).toBe(2000);
  });
  it("空态 → 0", () => {
    expect(computePrescriptionReviewCountV13([])).toBe(0);
  });
});

describe("computeIrrationalPrescriptionRateV13", () => {
  // 算式：(50+50)/(1000+1000) = 100/2000×100 = 5.00
  it("不合理处方率 = 5.00%", () => {
    expect(computeIrrationalPrescriptionRateV13(records)).toBe(5.00);
  });
});

describe("computeSpecialPrescriptionReviewCountV13", () => {
  // 算式：100+100 = 200
  it("专项处方点评数 = 200 张", () => {
    expect(computeSpecialPrescriptionReviewCountV13(records)).toBe(200);
  });
});

describe("prescriptionReviewStatsV13Routes 读路由", () => {
  it("GET /api/v1/prescription-review-stats 路由存在且 auth:true", () => {
    const route = prescriptionReviewStatsV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/prescription-review-stats",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
