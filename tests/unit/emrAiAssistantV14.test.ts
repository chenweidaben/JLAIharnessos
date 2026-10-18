/**
 * 健澜科技 jlmedaios - 病历 AI 辅助书写实时建议 V14 单测（M467-B）
 *
 * 测试 generateSuggestions 关键词匹配、rankSuggestions 优先级降序、POST /suggest auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  generateSuggestions,
  rankSuggestions,
  type SuggestionV14,
} from "../../src/bff/aggregators/emrAiAssistantV14Aggregator";
import { emrAiAssistantV14Routes } from "../../src/bff/routes/emrAiAssistantV14";
import type { RouteDef } from "../../src/bff/types";

describe("generateSuggestions 咳嗽", () => {
  // 手算：context 含"咳嗽" → 建议"补充咳痰性状描述"（priority=4）
  it("context='患者咳嗽3天' → 返回含'补充咳痰性状描述'的建议", () => {
    const suggestions = generateSuggestions("患者咳嗽3天");
    expect(suggestions.some((s) => s.text.includes("咳痰性状"))).toBe(true);
  });
});

describe("generateSuggestions 空 context", () => {
  // 手算：context="" → 返回空数组 []
  it("context='' → 返回空数组", () => {
    expect(generateSuggestions("")).toEqual([]);
  });
});

describe("generateSuggestions 发热", () => {
  // 手算：context 含"发热" → 建议"补充体温峰值与热型"（priority=5）
  it("context 含'发热' → 返回含'体温峰值'的建议", () => {
    const suggestions = generateSuggestions("患者发热39度");
    expect(suggestions.some((s) => s.text.includes("体温峰值"))).toBe(true);
  });
});

describe("rankSuggestions 优先级降序", () => {
  // 手算：priority 3/5/1 → 排序后 5/3/1
  it("priority 3/5/1 → 排序后 5/3/1", () => {
    const input: SuggestionV14[] = [
      { id: "A", text: "建议A", priority: 3 },
      { id: "B", text: "建议B", priority: 5 },
      { id: "C", text: "建议C", priority: 1 },
    ];
    const ranked = rankSuggestions(input);
    expect(ranked[0]?.priority).toBe(5);
    expect(ranked[1]?.priority).toBe(3);
    expect(ranked[2]?.priority).toBe(1);
  });
});

describe("读路由", () => {
  it("POST /api/v1/emr-ai-assistant/suggest auth:true", () => {
    const def = (emrAiAssistantV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-ai-assistant/suggest");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
