/**
 * 健澜科技 jlmedaios - 健康科普 V3 纯函数单测（M246-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildHealthMediaV3Report,
  planHealthContentV3,
  trackMediaEngagementV3,
} from "../../src/bff/aggregators/healthMediaV3ReportAggregator";

describe("planHealthContentV3", () => {
  it("高血压+短视频 → 爆款潜力", () => {
    expect(planHealthContentV3("高血压防治", "短视频").viral).toBe(true);
  });
});

describe("trackMediaEngagementV3", () => {
  it("浏览10000点赞500分享100 → 互动率6%", () => {
    expect(trackMediaEngagementV3({ title: "test" }, { views: 10000, likes: 500, shares: 100 }).engagementRate).toBe(6);
  });
});

describe("buildHealthMediaV3Report", () => {
  it("生成内容数据", () => {
    const r = buildHealthMediaV3Report("30d");
    expect(r.content.articles).toBeGreaterThan(0);
  });

  it("生成矩阵数据", () => {
    const r = buildHealthMediaV3Report("30d");
    expect(r.matrix.wechat).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildHealthMediaV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
