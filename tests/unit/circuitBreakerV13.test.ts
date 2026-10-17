/**
 * 健澜科技 jlmedaios - 反向证据熔断 V13 单测（M300-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildCircuitBreakerReportV13,
  detectReverseEvidenceV13,
  triggerCircuitBreakerV13,
  type BrokenExpV13,
} from "../../src/bff/aggregators/circuitBreakerV13Aggregator";
import { circuitBreakerV13Routes } from "../../src/bff/routes/circuitBreakerV13";

const broken: BrokenExpV13[] = [
  triggerCircuitBreakerV13("e-x1", "某抗凝", 3.5),
  triggerCircuitBreakerV13("e-x2", "某术后", 2.0),
];

describe("detectReverseEvidenceV13", () => {
  it("effectSize=3.5 > 0 → reverse=true", () => {
    expect(detectReverseEvidenceV13(3.5)).toBe(true);
  });
  it("effectSize=-3 < 0 → reverse=false（改善）", () => {
    expect(detectReverseEvidenceV13(-3)).toBe(false);
  });
});

describe("triggerCircuitBreakerV13", () => {
  it("status=circuit_broken", () => {
    const b = triggerCircuitBreakerV13("e-x1", "x", 3.5);
    expect(b.status).toBe("circuit_broken");
  });
});

describe("buildCircuitBreakerReportV13", () => {
  it("2条熔断 avg=(3.5+2.0)/2=2.8", () => {
    const r = buildCircuitBreakerReportV13(broken);
    expect(r.brokenCount).toBe(2);
    expect(r.avgEffectSize).toBe(2.8);
    expect(r.action).toContain("2 条反向经验");
  });
  it("空态 → brokenCount=0 且 action 含'系统正常'", () => {
    const r = buildCircuitBreakerReportV13([]);
    expect(r.brokenCount).toBe(0);
    expect(r.action).toContain("系统正常");
  });
});

describe("circuitBreakerV13Routes 读路由", () => {
  it("GET /api/v1/circuit-breaker 路由存在且 auth:true", () => {
    const route = circuitBreakerV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/circuit-breaker",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
