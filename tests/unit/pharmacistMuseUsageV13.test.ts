/**
 * 健澜科技 jlmedaios - 药师个人智能体使用统计 V13 单测（M320-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  classifyPharmacistScenariosV13,
  computeAdoptionRateV13,
  computePharmacistCallCountV13,
  type PharmacistMuseFeedbackV13,
  type PharmacistMuseUsageV13,
} from "../../src/bff/aggregators/pharmacistMuseUsageV13Aggregator";
import { pharmacistMuseUsageV13Routes } from "../../src/bff/routes/pharmacistMuseUsageV13";

const usages: PharmacistMuseUsageV13[] = [
  { usageId: "u1", pharmacistId: "p1", scenario: "prescriptionReview" },
  { usageId: "u2", pharmacistId: "p1", scenario: "prescriptionReview" },
  { usageId: "u3", pharmacistId: "p1", scenario: "prescriptionReview" },
  { usageId: "u4", pharmacistId: "p1", scenario: "interaction" },
  { usageId: "u5", pharmacistId: "p2", scenario: "interaction" },
  { usageId: "u6", pharmacistId: "p2", scenario: "interaction" },
  { usageId: "u7", pharmacistId: "p2", scenario: "contraindication" },
  { usageId: "u8", pharmacistId: "p3", scenario: "contraindication" },
  { usageId: "u9", pharmacistId: "p3", scenario: "contraindication" },
  { usageId: "u10", pharmacistId: "p3", scenario: "prescriptionReview" },
];

const feedbacks: PharmacistMuseFeedbackV13[] = [
  { feedbackId: "f1", pharmacistId: "p1", isAdopted: true },
  { feedbackId: "f2", pharmacistId: "p1", isAdopted: true },
  { feedbackId: "f3", pharmacistId: "p1", isAdopted: true },
  { feedbackId: "f4", pharmacistId: "p1", isAdopted: true },
  { feedbackId: "f5", pharmacistId: "p1", isAdopted: true },
  { feedbackId: "f6", pharmacistId: "p1", isAdopted: true },
  { feedbackId: "f7", pharmacistId: "p1", isAdopted: true },
  { feedbackId: "f8", pharmacistId: "p1", isAdopted: true },
  { feedbackId: "f9", pharmacistId: "p1", isAdopted: true },
  { feedbackId: "f10", pharmacistId: "p1", isAdopted: false },
];

describe("computePharmacistCallCountV13", () => {
  // 算式：p1 调用 = u1+u2+u3+u4 = 4
  it("p1 callCount = 4", () => {
    expect(computePharmacistCallCountV13(usages, "p1")).toBe(4);
  });
  it("空态 → 0", () => {
    expect(computePharmacistCallCountV13([], "p1")).toBe(0);
  });
});

describe("classifyPharmacistScenariosV13", () => {
  // 算式：prescriptionReview = u1+u2+u3+u10 = 4
  // interaction = u4+u5+u6 = 3
  // contraindication = u7+u8+u9 = 3
  it("prescriptionReview=4, interaction=3, contraindication=3", () => {
    const d = classifyPharmacistScenariosV13(usages);
    expect(d.prescriptionReview).toBe(4);
    expect(d.interaction).toBe(3);
    expect(d.contraindication).toBe(3);
  });
});

describe("computeAdoptionRateV13", () => {
  // 算式：p1 10 反馈中采纳 = f1-f9 = 9 → 9/10×100 = 90
  it("p1 adoptionRate = 90", () => {
    expect(computeAdoptionRateV13(feedbacks, "p1")).toBe(90);
  });
});

describe("pharmacistMuseUsageV13Routes 读路由", () => {
  it("GET /api/v1/pharmacist-muse-usage 路由存在且 auth:true", () => {
    const route = pharmacistMuseUsageV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/pharmacist-muse-usage",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
