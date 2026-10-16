/**
 * 健澜科技 jlmedaios - 零信任与身份安全 V5 纯函数单测（M261-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildZeroTrustV5Report,
  detectAnomalousAccessV5,
  evaluateAccessV5,
} from "../../src/bff/aggregators/zeroTrustV5ReportAggregator";

describe("evaluateAccessV5", () => {
  it("未启用MFA → 拒绝访问", () => {
    expect(evaluateAccessV5({ mfa: false, role: "doctor" }, { compliant: true, managed: true }, { sensitivity: "内部" }).allowed).toBe(false);
  });
});

describe("detectAnomalousAccessV5", () => {
  it("横向移动 → 高风险自动隔离", () => {
    expect(detectAnomalousAccessV5({ accessCount: 10, unusualTime: false, lateralMove: true }).level).toBe("高");
  });
});

describe("buildZeroTrustV5Report", () => {
  it("生成身份数据", () => {
    const r = buildZeroTrustV5Report("30d");
    expect(r.identity.sso).toBeGreaterThan(0);
  });

  it("生成零信任数据", () => {
    const r = buildZeroTrustV5Report("30d");
    expect(r.zeroTrust.neverTrust).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildZeroTrustV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
