/**
 * 健澜科技 jlmedaios - 老年全周期 V3 纯函数单测（M239-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessCognitionV3,
  assessFrailtyV3,
  buildGeriatricsLifecycleV3Report,
} from "../../src/bff/aggregators/geriatricsLifecycleV3ReportAggregator";

describe("assessFrailtyV3", () => {
  it("5项Fried全阳性 → 衰弱", () => {
    expect(assessFrailtyV3({ weightLoss: true, exhaustion: true, weakness: true, slowWalking: true, lowActivity: true }).level).toBe("衰弱");
  });
});

describe("assessCognitionV3", () => {
  it("MMSE 25 → 认知障碍", () => {
    expect(assessCognitionV3(25, 24).mmse).toBe("认知障碍");
  });
});

describe("buildGeriatricsLifecycleV3Report", () => {
  it("生成CGA数据", () => {
    const r = buildGeriatricsLifecycleV3Report("30d");
    expect(r.cga).toBeGreaterThan(0);
  });

  it("生成衰弱数据", () => {
    const r = buildGeriatricsLifecycleV3Report("30d");
    expect(r.frailty.frail).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildGeriatricsLifecycleV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
