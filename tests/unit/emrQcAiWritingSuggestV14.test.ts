/**
 * 健澜科技 jlmedaios - 质控 AI 书写建议 V14 单测（M499-B）
 *
 * 测试 suggestWriting 建议生成、buildSuggestReport 构建报告、POST 路由 auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildSuggestReport,
  suggestWriting,
  type SuggestReportV14,
  type SuggestResultV14,
} from "../../src/bff/aggregators/emrQcAiWritingSuggestV14Aggregator";
import { emrQcAiWritingSuggestV14Routes } from "../../src/bff/routes/emrQcAiWritingSuggestV14";
import type { RouteDef } from "../../src/bff/types";

describe("suggestWriting 主诉缺失", () => {
  // 手算：context='主诉缺失' → suggestions 包含'补充主诉内容'（关键词"主诉"匹配）
  it("context='主诉缺失' → suggestions 包含'补充主诉内容'", () => {
    const result: SuggestResultV14 = suggestWriting("主诉缺失");
    expect(result.suggestions).toContain("补充主诉内容");
  });
});

describe("suggestWriting 现病史太简单", () => {
  // 手算：context='现病史太简单' → suggestions 包含'扩展现病史细节'（关键词"现病史"匹配）
  it("context='现病史太简单' → suggestions 包含'扩展现病史细节'", () => {
    const result: SuggestResultV14 = suggestWriting("现病史太简单");
    expect(result.suggestions).toContain("扩展现病史细节");
  });
});

describe("buildSuggestReport 两条建议", () => {
  // 手算：{suggestions:['建议1','建议2']} → count=2（数组长度）
  it("{suggestions:['建议1','建议2']} → count=2", () => {
    const report: SuggestReportV14 = buildSuggestReport({ suggestions: ["建议1", "建议2"] });
    expect(report.count).toBe(2);
    expect(report.suggestions.length).toBe(2);
  });
});

describe("buildSuggestReport 空数组", () => {
  // 手算：{suggestions:[]} → count=0（空数组长度）
  it("{suggestions:[]} → count=0", () => {
    const report: SuggestReportV14 = buildSuggestReport({ suggestions: [] });
    expect(report.count).toBe(0);
  });
});

describe("POST 路由", () => {
  it("POST /api/v1/emr-qc-ai-writing-suggest auth:true", () => {
    const def = (emrQcAiWritingSuggestV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-qc-ai-writing-suggest");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
