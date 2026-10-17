/**
 * 健澜科技 jlmedaios - 营养食堂 V13 单测（M352-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDiningSatisfactionV13,
  computeHygienePassRateV13,
  computeSampleRetentionRateV13,
  type NutritionKitchenRecordV13,
} from "../../src/bff/aggregators/nutritionKitchenV13Aggregator";
import { nutritionKitchenV13Routes } from "../../src/bff/routes/nutritionKitchenV13";

const records: NutritionKitchenRecordV13[] = [
  { hygienePassedCount: 98, hygieneSampledCount: 100, sampleRetainedCount: 100, sampleShouldCount: 100, diningSatisfaction: 4.2 },
  { hygienePassedCount: 97, hygieneSampledCount: 100, sampleRetainedCount: 100, sampleShouldCount: 100, diningSatisfaction: 4.3 },
];

describe("computeHygienePassRateV13", () => {
  // 算式：(98+97)/(100+100) = 195/200×100 = 97.50
  it("膳食卫生合格率 = 97.50%", () => {
    expect(computeHygienePassRateV13(records)).toBe(97.50);
  });
  it("空态 → 0", () => {
    expect(computeHygienePassRateV13([])).toBe(0);
  });
});

describe("computeSampleRetentionRateV13", () => {
  // 算式：(100+100)/(100+100) = 200/200×100 = 100.00
  it("留样合规率 = 100.00%", () => {
    expect(computeSampleRetentionRateV13(records)).toBe(100.00);
  });
});

describe("computeDiningSatisfactionV13", () => {
  // 算式：(4.2+4.3)/2 = 8.5/2 = 4.25
  it("就餐满意度 = 4.25", () => {
    expect(computeDiningSatisfactionV13(records)).toBe(4.25);
  });
});

describe("nutritionKitchenV13Routes 读路由", () => {
  it("GET /api/v1/nutrition-kitchen 路由存在且 auth:true", () => {
    const route = nutritionKitchenV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/nutrition-kitchen",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
