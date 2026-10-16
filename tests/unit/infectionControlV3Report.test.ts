/**
 * 健澜科技 jlmedaios - 院感控制 V3 纯函数单测（M256-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessMRSAControlV3,
  buildInfectionControlV3Report,
  calculateInfectionRateV3,
} from "../../src/bff/aggregators/infectionControlV3ReportAggregator";

describe("calculateInfectionRateV3", () => {
  it("感染5例床日1000 → 千日5 ‰达标", () => {
    expect(calculateInfectionRateV3(5, 1000).adequate).toBe(true);
  });
});

describe("assessMRSAControlV3", () => {
  it("MRSA50+VRE30+CRE20+CRAB40=140隔离135 → 96%达标", () => {
    expect(assessMRSAControlV3({ mrsa: 50, vre: 30, cre: 20, crab: 40 }, 135).adequate).toBe(true);
  });
});

describe("buildInfectionControlV3Report", () => {
  it("生成手卫生数据", () => {
    const r = buildInfectionControlV3Report("30d");
    expect(r.handHygiene.compliance).toBeGreaterThan(0);
  });

  it("生成目标监测数据", () => {
    const r = buildInfectionControlV3Report("30d");
    expect(r.target.icu).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildInfectionControlV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
