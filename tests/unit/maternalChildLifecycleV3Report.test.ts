/**
 * 健澜科技 jlmedaios - 妇幼全周期 V3 纯函数单测（M239-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessPregnancyRiskV3,
  buildMaternalChildLifecycleV3Report,
  trackChildGrowthV3,
} from "../../src/bff/aggregators/maternalChildLifecycleV3ReportAggregator";

describe("assessPregnancyRiskV3", () => {
  it("高龄+高血压+糖尿病 → 高风险", () => {
    expect(assessPregnancyRiskV3(["高龄", "高血压", "糖尿病"]).level).toBe("高");
  });
});

describe("trackChildGrowthV3", () => {
  it("1岁10kg → 正常", () => {
    expect(trackChildGrowthV3(1, { height: 75, weight: 10 }).normal).toBe(true);
  });
});

describe("buildMaternalChildLifecycleV3Report", () => {
  it("生成孕前数据", () => {
    const r = buildMaternalChildLifecycleV3Report("30d");
    expect(r.preconception).toBeGreaterThan(0);
  });

  it("生成儿童数据", () => {
    const r = buildMaternalChildLifecycleV3Report("30d");
    expect(r.child.growth).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildMaternalChildLifecycleV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
