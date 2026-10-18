/**
 * 健澜科技 jlmedaios - AI 病历关键词提取 V14 单测（M486-B）
 *
 * 测试 extractAiKeywords 提取、buildKeywordReport 报告、读路由 POST auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  extractAiKeywords,
  buildKeywordReport,
  type AiKeywordResultV14,
} from "../../src/bff/aggregators/emrAiKeywordV14Aggregator";
import { emrAiKeywordV14Routes } from "../../src/bff/routes/emrAiKeywordV14";
import type { RouteDef } from "../../src/bff/types";

describe("extractAiKeywords 头痛发热", () => {
  // 手算：含"头痛发热" → keywords 非空
  it("含头痛发热 → keywords 非空", () => {
    const result: AiKeywordResultV14 = extractAiKeywords("患者头痛发热3天");
    expect(result.keywords.length).toBeGreaterThan(0);
  });
});

describe("extractAiKeywords 空内容", () => {
  // 手算：空内容 → keywords=[]
  it("空内容 → keywords=[]", () => {
    const result: AiKeywordResultV14 = extractAiKeywords("");
    expect(result.keywords.length).toBe(0);
  });
});

describe("buildKeywordReport 3关键词", () => {
  // 手算：keywords=['头痛','发热','咳嗽'] → keywordCount=3
  it("keywords=['头痛','发热','咳嗽'] → keywordCount=3", () => {
    const result: AiKeywordResultV14 = { content: "test", keywords: ["头痛", "发热", "咳嗽"] };
    const report = buildKeywordReport(result);
    expect(report.keywordCount).toBe(3);
  });
});

describe("buildKeywordReport 空关键词", () => {
  // 手算：keywords=[] → keywordCount=0
  it("keywords=[] → keywordCount=0", () => {
    const result: AiKeywordResultV14 = { content: "test", keywords: [] };
    const report = buildKeywordReport(result);
    expect(report.keywordCount).toBe(0);
  });
});

describe("读路由", () => {
  it("POST /api/v1/emr-ai-keyword auth:true", () => {
    const def = (emrAiKeywordV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-ai-keyword");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
