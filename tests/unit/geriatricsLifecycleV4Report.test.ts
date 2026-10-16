/**
 * 健澜科技 jlmedaios - 老年 V4 纯函数单测（M249-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessCognitionV4,
  assessFrailtyV4,
  buildGeriatricsLifecycleV4Report,
} from "../../src/bff/aggregators/geriatricsLifecycleV4ReportAggregator";

describe("assessFrailtyV4", () => {
  it("握力20步速0.6 SPPB8 → 衰弱", () => {
    expect(assessFrailtyV4({ grip: 20, speed: 0.6, sppb: 8 }).level).toBe("衰弱");
  });
});

describe("assessCognitionV4", () => {
  it("MMSE25 MoCA24 → 认知障碍", () => {
    expect(assessCognitionV4(25, 24).impairment).toBe(true);
  });
});

describe("buildGeriatricsLifecycleV4Report", () => {
  it("生成 CGA 数据", () => {
    const r = buildGeriatricsLifecycleV4Report("30d");
    expect(r.cga.patients).toBeGreaterThan(0);
  });

  it("生成综合征数据", () => {
    const r = buildGeriatricsLifecycleV4Report("30d");
    expect(r.syndrome.dementia).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildGeriatricsLifecycleV4Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
