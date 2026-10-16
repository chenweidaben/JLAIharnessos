/**
 * 健澜科技 jlmedaios - 文化品牌 V3 纯函数单测（M245-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessBrandAwarenessV3,
  buildCultureBrandV3Report,
  buildCulturePlanV3,
} from "../../src/bff/aggregators/cultureBrandV3ReportAggregator";

describe("assessBrandAwarenessV3", () => {
  it("内部90外部80 → 认知85", () => {
    expect(assessBrandAwarenessV3({ internal: 90, external: 80, nps: 50 }).awareness).toBe(85);
  });
});

describe("buildCulturePlanV3", () => {
  it("年度主题+季度4活动月12活动 → 16项", () => {
    expect(buildCulturePlanV3({ annual: "仁爱精医", quarterly: ["q1", "q2", "q3", "q4"], monthly: ["m1", "m2", "m3", "m4", "m5", "m6", "m7", "m8", "m9", "m10", "m11", "m12"] }).activities).toBe(16);
  });
});

describe("buildCultureBrandV3Report", () => {
  it("生成精神数据", () => {
    const r = buildCultureBrandV3Report("30d");
    expect(r.spirit.motto.length).toBeGreaterThan(0);
  });

  it("生成媒体数据", () => {
    const r = buildCultureBrandV3Report("30d");
    expect(r.media.wechat).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildCultureBrandV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
