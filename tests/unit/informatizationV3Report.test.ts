/**
 * 健澜科技 jlmedaios - 信息化规划 V3 纯函数单测（M244-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessInformatizationMaturityV3,
  buildITRoadmapV3,
  buildInformatizationV3Report,
} from "../../src/bff/aggregators/informatizationV3ReportAggregator";

describe("assessInformatizationMaturityV3", () => {
  it("业务90数据80技术85集成80 → L4", () => {
    expect(assessInformatizationMaturityV3({ business: 90, data: 80, tech: 85, integration: 80 }).level).toBe("L4");
  });
});

describe("buildITRoadmapV3", () => {
  it("项目10预算5000万 → 均500万", () => {
    expect(buildITRoadmapV3(10, 5000).avgCost).toBe(500);
  });
});

describe("buildInformatizationV3Report", () => {
  it("生成战略数据", () => {
    const r = buildInformatizationV3Report("30d");
    expect(r.strategy.years).toBeGreaterThan(0);
  });

  it("生成系统数据", () => {
    const r = buildInformatizationV3Report("30d");
    expect(r.systems.his).toBeGreaterThanOrEqual(0);
  });

  it("生成建议", () => {
    const r = buildInformatizationV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
