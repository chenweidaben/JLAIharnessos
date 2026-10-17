/**
 * 健澜科技 jlmedaios - 检验 AI 使用统计 V13 单测（M325-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeLabAdoptionRateV13,
  countLabReviewCallsV13,
  type LabAiRecordV13,
} from "../../src/bff/aggregators/labAiUsageV13Aggregator";
import { labAiUsageV13Routes } from "../../src/bff/routes/labAiUsageV13";

const records: LabAiRecordV13[] = [
  { isAdopted: true },
  { isAdopted: true },
  { isAdopted: true },
  { isAdopted: true },
  { isAdopted: true },
  { isAdopted: true },
  { isAdopted: true },
  { isAdopted: true },
  { isAdopted: false },
  { isAdopted: false },
];

describe("countLabReviewCallsV13", () => {
  // 算式：10 次复核
  it("复核调用量 = 10", () => {
    expect(countLabReviewCallsV13(records)).toBe(10);
  });
  it("空态 → 0", () => {
    expect(countLabReviewCallsV13([])).toBe(0);
  });
});

describe("computeLabAdoptionRateV13", () => {
  // 算式：8/10×100 = 80
  it("采纳率 = 80%", () => {
    expect(computeLabAdoptionRateV13(records)).toBe(80);
  });
  it("空态采纳率 → 0", () => {
    expect(computeLabAdoptionRateV13([])).toBe(0);
  });
});

describe("labAiUsageV13Routes 读路由", () => {
  it("GET /api/v1/lab-ai-usage 路由存在且 auth:true", () => {
    const route = labAiUsageV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/lab-ai-usage",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
