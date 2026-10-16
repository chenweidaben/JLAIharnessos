/**
 * 健澜科技 jlmedaios - 质量安全智能化 V2 纯函数单测（M233-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildQualitySafetyIntelligentV2,
  detectAdverseEvent,
  earlyWarningScore,
} from "../../src/bff/aggregators/qualitySafetyIntelligentV2Aggregator";

describe("earlyWarningScore", () => {
  it("低血压+意识改变 → 高危", () => {
    expect(earlyWarningScore("低血压意识改变", "").level).toBe("高危");
  });

  it("正常体征 → 低危", () => {
    expect(earlyWarningScore("正常", "").level).toBe("低危");
  });
});

describe("detectAdverseEvent", () => {
  it("用药错误模式 → 检出", () => {
    expect(detectAdverseEvent("用药错误", "2024-01-01").detected).toBe(true);
  });

  it("正常模式 → 未检出", () => {
    expect(detectAdverseEvent("正常", "2024-01-01").detected).toBe(false);
  });
});

describe("buildQualitySafetyIntelligentV2", () => {
  it("生成预警数据", () => {
    const r = buildQualitySafetyIntelligentV2("30d");
    expect(r.alerts.fall).toBeGreaterThan(0);
  });

  it("生成MEWS数据", () => {
    const r = buildQualitySafetyIntelligentV2("30d");
    expect(r.mews.earlyWarning).toBeGreaterThan(0);
  });

  it("生成质控数据", () => {
    const r = buildQualitySafetyIntelligentV2("30d");
    expect(r.qc.intercept).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildQualitySafetyIntelligentV2("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
