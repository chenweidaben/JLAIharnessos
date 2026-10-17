/**
 * 健澜科技 jlmedaios - 疗效证据反哺规则权重 V13 单测（M300-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  adjustWeightByEvidenceV13,
  buildEvidenceDrivenRuleV13,
  filterEvidenceBasedRulesV13,
  type EvidenceRuleV13,
} from "../../src/bff/aggregators/evidenceRulesV13Aggregator";
import { evidenceRulesV13Routes } from "../../src/bff/routes/evidenceRulesV13";

describe("adjustWeightByEvidenceV13", () => {
  it("strong +0.15：0.5 → 0.65", () => {
    expect(adjustWeightByEvidenceV13(0.5, "strong")).toBe(0.65);
  });
  it("reverse -0.10：0.4 → 0.30", () => {
    expect(adjustWeightByEvidenceV13(0.4, "reverse")).toBe(0.3);
  });
  it("inconclusive 不变：0.3 → 0.3", () => {
    expect(adjustWeightByEvidenceV13(0.3, "inconclusive")).toBe(0.3);
  });
});

describe("buildEvidenceDrivenRuleV13", () => {
  it("e-1 strong base=0.5 → adjusted=0.65", () => {
    const r = buildEvidenceDrivenRuleV13("e-1", 0.5, "strong");
    expect(r.adjustedWeight).toBe(0.65);
    expect(r.evidenceLevel).toBe("strong");
  });
});

describe("filterEvidenceBasedRulesV13", () => {
  const rules: EvidenceRuleV13[] = [
    buildEvidenceDrivenRuleV13("e-1", 0.5, "strong"),
    buildEvidenceDrivenRuleV13("e-2", 0.4, "moderate"),
    buildEvidenceDrivenRuleV13("e-3", 0.3, "inconclusive"),
    buildEvidenceDrivenRuleV13("e-4", 0.4, "reverse"),
  ];
  it("4条 → 过滤后剩3条（剔除 inconclusive）", () => {
    const filtered = filterEvidenceBasedRulesV13(rules);
    expect(filtered.length).toBe(3);
    expect(filtered.every((r) => r.evidenceLevel !== "inconclusive")).toBe(true);
  });
  it("空态 → 0", () => {
    expect(filterEvidenceBasedRulesV13([]).length).toBe(0);
  });
});

describe("evidenceRulesV13Routes 读路由", () => {
  it("GET /api/v1/evidence-rules 路由存在且 auth:true", () => {
    const route = evidenceRulesV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/evidence-rules",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
