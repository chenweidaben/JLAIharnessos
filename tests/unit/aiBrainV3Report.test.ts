/**
 * 健澜科技 jlmedaios - AI 大脑 V3 纯函数单测（M232-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessAIQuality,
  buildAIBrainV3Report,
  routeModel,
} from "../../src/bff/aggregators/aiBrainV3ReportAggregator";

describe("routeModel", () => {
  it("影像查询 → 自研医学影像模型", () => {
    expect(routeModel("CT影像分析", "").model).toContain("影像");
  });

  it("通用查询 → 通义千问", () => {
    expect(routeModel("天气", "").model).toBe("通义千问");
  });
});

describe("assessAIQuality", () => {
  it("完全一致 → 100分", () => {
    expect(assessAIQuality("糖尿病", "糖尿病").score).toBe(100);
  });

  it("完全不同 → 低分", () => {
    expect(assessAIQuality("abc", "xyz").score).toBeLessThan(50);
  });
});

describe("buildAIBrainV3Report", () => {
  it("生成模型数据", () => {
    const r = buildAIBrainV3Report("30d");
    expect(r.models.available).toBeGreaterThan(0);
  });

  it("生成RAG数据", () => {
    const r = buildAIBrainV3Report("30d");
    expect(r.rag.vectorDB).toBe(true);
  });

  it("生成Agent数据", () => {
    const r = buildAIBrainV3Report("30d");
    expect(r.agent.planning).toBe(true);
  });

  it("生成建议", () => {
    const r = buildAIBrainV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
