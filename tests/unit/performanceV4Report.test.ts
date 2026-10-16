/**
 * 健澜科技 jlmedaios - 绩效 V4 纯函数单测（M250-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildPerformanceV4Report,
  calculatePerformanceScoreV4,
  distributePerformanceV4,
} from "../../src/bff/aggregators/performanceV4ReportAggregator";

describe("calculatePerformanceScoreV4", () => {
  it("质量90权重0.5数量80权重0.3效率70权重0.2 → 83", () => {
    expect(calculatePerformanceScoreV4({ quality: 90, quantity: 80, efficiency: 70 }, { quality: 0.5, quantity: 0.3, efficiency: 0.2 }).score).toBe(83);
  });
});

describe("distributePerformanceV4", () => {
  it("总额1000两人得分80/90系数1/1 → 按比例", () => {
    expect(distributePerformanceV4(1000, [80, 90], [1, 1]).length).toBe(2);
  });
});

describe("buildPerformanceV4Report", () => {
  it("生成国考数据", () => {
    const r = buildPerformanceV4Report("30d");
    expect(r.national.grade).toBeTruthy();
  });

  it("生成 DRG 数据", () => {
    const r = buildPerformanceV4Report("30d");
    expect(r.drg.cmi).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildPerformanceV4Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
