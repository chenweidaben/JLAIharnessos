/**
 * 健澜科技 jlmedaios - 疗效证据总览 V13 单测（M300-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildEvidenceOverviewV13,
  computeEvidenceCoverageV13,
  identifyEvidenceGapV13,
  type CircuitBreakItemV13,
  type EvidenceRankItemV13,
  type EvidenceRuleItemV13,
} from "../../src/bff/aggregators/evidenceOverviewV13Aggregator";
import { evidenceOverviewV13Routes } from "../../src/bff/routes/evidenceOverviewV13";

const ranks: EvidenceRankItemV13[] = [
  { experienceId: "e-1", effectSize: -12, strength: "strong" },
  { experienceId: "e-2", effectSize: -8, strength: "moderate" },
  { experienceId: "e-3", effectSize: -3, strength: "weak" },
  { experienceId: "e-4", effectSize: 1, strength: "inconclusive" },
];

const rules: EvidenceRuleItemV13[] = [
  { experienceId: "e-1", evidenceLevel: "strong" },
  { experienceId: "e-2", evidenceLevel: "moderate" },
  { experienceId: "e-3", evidenceLevel: "weak" },
  { experienceId: "e-4", evidenceLevel: "inconclusive" },
];

const circuitBreaks: CircuitBreakItemV13[] = [
  { experienceId: "e-x1" },
];

describe("buildEvidenceOverviewV13", () => {
  it("strong=1 moderate=1 weak=1 inconclusive=1 broken=1", () => {
    const o = buildEvidenceOverviewV13(ranks, rules, circuitBreaks);
    expect(o.strongCount).toBe(1);
    expect(o.moderateCount).toBe(1);
    expect(o.weakCount).toBe(1);
    expect(o.inconclusiveCount).toBe(1);
    expect(o.circuitBrokenCount).toBe(1);
  });
  it("空态 → 全0", () => {
    const o = buildEvidenceOverviewV13([], [], []);
    expect(o.strongCount).toBe(0);
  });
});

describe("computeEvidenceCoverageV13", () => {
  it("1 strong / 4 total → 25", () => {
    expect(computeEvidenceCoverageV13(1, 4)).toBe(25);
  });
  it("0+0 → 0", () => {
    expect(computeEvidenceCoverageV13(0, 0)).toBe(0);
  });
});

describe("identifyEvidenceGapV13", () => {
  it("broken=1 → '存在反向经验需复盘'", () => {
    const o = buildEvidenceOverviewV13(ranks, rules, circuitBreaks);
    expect(identifyEvidenceGapV13(o)).toContain("反向经验需复盘");
  });
  it("无熔断+strong≥3 → 空串", () => {
    const o = buildEvidenceOverviewV13(
      [
        { experienceId: "a", effectSize: -12, strength: "strong" },
        { experienceId: "b", effectSize: -13, strength: "strong" },
        { experienceId: "c", effectSize: -14, strength: "strong" },
      ],
      [],
      [],
    );
    expect(identifyEvidenceGapV13(o)).toBe("");
  });
});

describe("evidenceOverviewV13Routes 读路由", () => {
  it("GET /api/v1/evidence-overview 路由存在且 auth:true", () => {
    const route = evidenceOverviewV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/evidence-overview",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
