/**
 * 健澜科技 jlmedaios - 零信任访问与权限最小化 V5 单测（M282-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessRiskV5,
  buildZeroTrustV5Report,
  enforceMFAV5,
  evaluatePolicyV5,
  type AccessPolicy,
  type SessionContext,
} from "../../src/bff/aggregators/zeroTrustV5Aggregator";
import { zeroTrustV5Routes } from "../../src/bff/routes/zeroTrustV5";

describe("evaluatePolicyV5", () => {
  it("allow策略且无deny→允许", () => {
    const policies: AccessPolicy[] = [
      { userId: "u1", role: "doctor", resource: "patient", action: "read", effect: "allow" },
    ];
    expect(evaluatePolicyV5(policies, "u1", "patient", "read")).toBe(true);
  });
  it("deny策略→拒绝", () => {
    const policies: AccessPolicy[] = [
      { userId: "u1", role: "extern", resource: "patient", action: "write", effect: "deny" },
    ];
    expect(evaluatePolicyV5(policies, "u1", "patient", "write")).toBe(false);
  });
});

describe("assessRiskV5", () => {
  it("新设备+不可能旅行+未过MFA=100分→高风险", () => {
    const s: SessionContext = { userId: "u", ip: "x", isNewDevice: true, isImpossibleTravel: true, mfaPassed: false };
    expect(assessRiskV5(s).level).toBe("high");
  });
  it("干净会话→低风险", () => {
    const s: SessionContext = { userId: "u", ip: "x", isNewDevice: false, isImpossibleTravel: false, mfaPassed: true };
    expect(assessRiskV5(s).level).toBe("low");
  });
});

describe("enforceMFAV5", () => {
  it("高风险→需要MFA", () => {
    expect(enforceMFAV5({ score: 100, level: "high" })).toBe(true);
  });
  it("低风险→不需要MFA", () => {
    expect(enforceMFAV5({ score: 0, level: "low" })).toBe(false);
  });
});

describe("buildZeroTrustV5Report", () => {
  it("1高风险会话→highRiskSessions=1", () => {
    const sessions: SessionContext[] = [
      { userId: "u1", ip: "x", isNewDevice: true, isImpossibleTravel: true, mfaPassed: false },
      { userId: "u2", ip: "y", isNewDevice: false, isImpossibleTravel: false, mfaPassed: true },
    ];
    const r = buildZeroTrustV5Report([], sessions);
    expect(r.highRiskSessions).toBe(1);
  });
});

describe("zeroTrustV5Routes 写权限", () => {
  it("POST /api/v1/zero-trust/policy 路由存在且 auth:true", () => {
    const post = zeroTrustV5Routes.find((r) => r.method === "POST" && r.path === "/api/v1/zero-trust/policy");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});
