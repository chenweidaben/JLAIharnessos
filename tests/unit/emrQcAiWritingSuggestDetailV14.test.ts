/**
 * 健澜科技 jlmedaios - 质控 AI 辅助书写建议明细 V14 单测（M508-B，-detail 避让）
 *
 * 测试 suggestWriting 建议、buildSuggestReport 报告、POST 路由 auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildSuggestReport,
  suggestWriting,
  type AiWritingSuggestResultDetailV14,
} from "../../src/bff/aggregators/emrQcAiWritingSuggestDetailV14Aggregator";
import { emrQcAiWritingSuggestDetailV14Routes } from "../../src/bff/routes/emrQcAiWritingSuggestDetailV14";
import type { RouteDef } from "../../src/bff/types";

describe("suggestWriting 内科主诉", () => {
  // 手算：dept='内科', section='主诉' → 关键词'主诉'匹配 → suggestions 包含 2 条以上建议
  it("dept='内科', section='主诉' → suggestions 包含 2 条以上建议", () => {
    const result = suggestWriting("内科", "主诉");
    expect(result.suggestions.length).toBeGreaterThanOrEqual(2);
  });
});

describe("suggestWriting 外科手术记录", () => {
  // 手算：dept='外科', section='手术记录' → 关键词'手术'匹配 → suggestions 包含手术相关建议
  it("dept='外科', section='手术记录' → suggestions 包含手术相关建议", () => {
    const result = suggestWriting("外科", "手术记录");
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.suggestions.some((s) => s.includes("手术"))).toBe(true);
  });
});

describe("buildSuggestReport 三条建议", () => {
  // 手算：{suggestions:['建议1','建议2','建议3']} → count=3（数组长度）
  it("{suggestions:['建议1','建议2','建议3']} → count=3", () => {
    const result: AiWritingSuggestResultDetailV14 = { suggestions: ["建议1", "建议2", "建议3"] };
    const report = buildSuggestReport("内科", "主诉", result);
    expect(report.count).toBe(3);
  });
});

describe("suggestWriting 儿科现病史", () => {
  // 手算：dept='儿科', section='现病史' → 关键词'现病史'匹配 → suggestions 非空
  it("dept='儿科', section='现病史' → suggestions 非空", () => {
    const result = suggestWriting("儿科", "现病史");
    expect(result.suggestions.length).toBeGreaterThan(0);
  });
});

describe("POST 路由", () => {
  it("POST /api/v1/emr-qc-ai-writing-suggest-detail auth:true", () => {
    const def = (emrQcAiWritingSuggestDetailV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-qc-ai-writing-suggest-detail");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
