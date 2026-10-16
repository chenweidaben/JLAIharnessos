/**
 * 健澜科技 jlmedaios - AI 大脑 3.0 V5 纯函数单测（M257-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessAIQualityV5,
  buildAIBrainV5Report,
  routeModelV5,
} from "../../src/bff/aggregators/aiBrainV5ReportAggregator";

describe("routeModelV5", () => {
  it("临床领域请求 → clinical-70b", () => {
    expect(routeModelV5("肺炎治疗", { domain: "clinical", latency: "normal" }).model).toBe("clinical-70b");
  });
});

describe("assessAIQualityV5", () => {
  it("100条匹配95条幻觉3% → 达标", () => {
    expect(assessAIQualityV5({ accuracy: 95, hallucination: 3 }, { match: 95, total: 100 }).adequate).toBe(true);
  });
});

describe("buildAIBrainV5Report", () => {
  it("生成多模型数据", () => {
    const r = buildAIBrainV5Report("30d");
    expect(r.multiModel.gpt).toBeGreaterThan(0);
  });

  it("生成RAG数据", () => {
    const r = buildAIBrainV5Report("30d");
    expect(r.rag.kb).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildAIBrainV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
