/**
 * 健澜科技 jlmedaios - 安全保卫 V3 纯函数单测（M243-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessFireSafetyV3,
  buildSecurityV3Report,
  handleViolenceV3,
} from "../../src/bff/aggregators/securityV3ReportAggregator";

describe("assessFireSafetyV3", () => {
  it("发现100整改99 → 99%优秀", () => {
    expect(assessFireSafetyV3({ smokeDetector: 2000, extinguisher: 500, exit: 100 }, { found: 100, rectified: 99 }).excellent).toBe(true);
  });
});

describe("handleViolenceV3", () => {
  it("持刀事件 → I级", () => {
    expect(handleViolenceV3({ type: "持刀", responseTime: 2 }).level).toBe("I级");
  });
});

describe("buildSecurityV3Report", () => {
  it("生成消防数据", () => {
    const r = buildSecurityV3Report("30d");
    expect(r.fire.detector).toBeGreaterThan(0);
  });

  it("生成门卫数据", () => {
    const r = buildSecurityV3Report("30d");
    expect(r.guard.visitor).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildSecurityV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
