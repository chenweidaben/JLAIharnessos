/**
 * 健澜科技 jlmedaios - AI 病历摘要生成 V14 单测（M486-A）
 *
 * 测试 generateAiSummary 生成、buildSummaryReport 报告、读路由 POST auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  generateAiSummary,
  buildSummaryReport,
  type AiSummaryResultV14,
} from "../../src/bff/aggregators/emrAiSummaryV14Aggregator";
import { emrAiSummaryV14Routes } from "../../src/bff/routes/emrAiSummaryV14";
import type { RouteDef } from "../../src/bff/types";

describe("generateAiSummary 含主诉", () => {
  // 手算：含"主诉：头痛" → summary 非空
  it("含主诉：头痛 → summary 非空", () => {
    const result: AiSummaryResultV14 = generateAiSummary("主诉：头痛3天，加重1天");
    expect(result.summary.length).toBeGreaterThan(0);
  });
});

describe("generateAiSummary 空内容", () => {
  // 手算：空内容 → summary 为空字符串
  it("空内容 → summary 为空字符串", () => {
    const result: AiSummaryResultV14 = generateAiSummary("");
    expect(result.summary).toBe("");
  });
});

describe("buildSummaryReport 50字", () => {
  // 手算：summaryLength=50 → 50/500≈0.1 → Math.ceil=1 分钟
  it("summaryLength=50 → readTime=1", () => {
    const result: AiSummaryResultV14 = { content: "test", summary: "a".repeat(50) };
    const report = buildSummaryReport(result);
    expect(report.readTime).toBe(1);
  });
});

describe("buildSummaryReport 0字", () => {
  // 手算：summaryLength=0 → summaryLength=0
  it("summaryLength=0 → summaryLength=0", () => {
    const result: AiSummaryResultV14 = { content: "test", summary: "" };
    const report = buildSummaryReport(result);
    expect(report.summaryLength).toBe(0);
  });
});

describe("读路由", () => {
  it("POST /api/v1/emr-ai-summary auth:true", () => {
    const def = (emrAiSummaryV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-ai-summary");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
