/**
 * 健澜科技 jlmedaios - 妇幼 V4 纯函数单测（M249-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessPregnancyRiskV4,
  buildMaternalChildLifecycleV4Report,
  trackChildGrowthV4,
} from "../../src/bff/aggregators/maternalChildLifecycleV4ReportAggregator";

describe("assessPregnancyRiskV4", () => {
  it("35岁+高血压+糖尿病 → 高风险", () => {
    expect(assessPregnancyRiskV4({ age: 35, hypertension: true, diabetes: true }).level).toBe("高");
  });
});

describe("trackChildGrowthV4", () => {
  it("6岁身高115 → 正常", () => {
    expect(trackChildGrowthV4(6, { height: 115, weight: 22 }).normal).toBe(true);
  });
});

describe("buildMaternalChildLifecycleV4Report", () => {
  it("生成孕期数据", () => {
    const r = buildMaternalChildLifecycleV4Report("30d");
    expect(r.pregnancy.prenatal).toBeGreaterThan(0);
  });

  it("生成产后数据", () => {
    const r = buildMaternalChildLifecycleV4Report("30d");
    expect(r.postpartum.breastfeeding).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildMaternalChildLifecycleV4Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
