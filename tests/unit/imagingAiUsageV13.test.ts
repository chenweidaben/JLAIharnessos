/**
 * 健澜科技 jlmedaios - 影像 AI 使用统计 V13 单测（M325-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  classifyImagingByOrganV13,
  computeDetectionRateV13,
  countImagingAiCallsV13,
  type ImagingAiRecordV13,
} from "../../src/bff/aggregators/imagingAiUsageV13Aggregator";
import { imagingAiUsageV13Routes } from "../../src/bff/routes/imagingAiUsageV13";

const records: ImagingAiRecordV13[] = [
  { organ: "lung", isPositive: true },
  { organ: "lung", isPositive: false },
  { organ: "lung", isPositive: false },
  { organ: "lung", isPositive: false },
  { organ: "liver", isPositive: true },
  { organ: "liver", isPositive: false },
  { organ: "liver", isPositive: false },
  { organ: "heart", isPositive: false },
  { organ: "heart", isPositive: false },
  { organ: "brain", isPositive: false },
];

describe("countImagingAiCallsV13", () => {
  // 算式：10 次调用
  it("调用量 = 10", () => {
    expect(countImagingAiCallsV13(records)).toBe(10);
  });
  it("空态 → 0", () => {
    expect(countImagingAiCallsV13([])).toBe(0);
  });
});

describe("computeDetectionRateV13", () => {
  // 算式：2/10×100 = 20
  it("检出率 = 20%", () => {
    expect(computeDetectionRateV13(records)).toBe(20);
  });
});

describe("classifyImagingByOrganV13", () => {
  // 算式：lung=4 / liver=3 / heart=2 / brain=1
  it("器官分组 = 4个器官", () => {
    const result = classifyImagingByOrganV13(records);
    expect(result.length).toBe(4);
    expect(result.find((d) => d.organ === "lung")?.count).toBe(4);
    expect(result.find((d) => d.organ === "liver")?.count).toBe(3);
    expect(result.find((d) => d.organ === "heart")?.count).toBe(2);
    expect(result.find((d) => d.organ === "brain")?.count).toBe(1);
  });
});

describe("imagingAiUsageV13Routes 读路由", () => {
  it("GET /api/v1/imaging-ai-usage 路由存在且 auth:true", () => {
    const route = imagingAiUsageV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/imaging-ai-usage",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
