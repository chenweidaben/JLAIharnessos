/**
 * 健澜科技 jlmedaios - 绩效 V3 纯函数单测（M240-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildPerformanceV3Report,
  calculatePerformanceScoreV3,
  distributePerformanceV3,
} from "../../src/bff/aggregators/performanceV3ReportAggregator";

describe("calculatePerformanceScoreV3", () => {
  it("[90,80]×[0.5,0.5] → 85分良好", () => {
    expect(calculatePerformanceScoreV3([90, 80], [0.5, 0.5]).level).toBe("良好");
  });
});

describe("distributePerformanceV3", () => {
  it("100万×[60,40] → 60万/40万", () => {
    const r = distributePerformanceV3(1000000, [60, 40], ["医生", "护士"]);
    expect(r[0].amount).toBe(600000);
    expect(r[1].amount).toBe(400000);
  });
});

describe("buildPerformanceV3Report", () => {
  it("生成院级数据", () => {
    const r = buildPerformanceV3Report("30d");
    expect(r.national.indicators).toBeGreaterThan(0);
  });

  it("生成个人数据", () => {
    const r = buildPerformanceV3Report("30d");
    expect(r.individual.doctor).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildPerformanceV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
