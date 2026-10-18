/**
 * 健澜科技 jlmedaios - 质控规则对比分析 V14 单测（M519-D，M519 收官）
 *
 * 测试 buildRuleCompare 构建对比、compareRuleSets 对比规则集、buildRuleCompareReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildRuleCompare,
  buildRuleCompareReport,
  compareRuleSets,
  type RuleSetV14,
} from "../../src/bff/aggregators/emrQcRuleCompareV14Aggregator";
import { emrQcRuleCompareV14Routes } from "../../src/bff/routes/emrQcRuleCompareV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildRuleCompare 构建对比", () => {
  // 手算：deptA='心内科', deptB='普外科', ruleName='病程记录及时性' → 正确构建
  it("deptA='心内科', deptB='普外科', ruleName='病程记录及时性' → 正确构建", () => {
    const compare = buildRuleCompare("心内科", "普外科", "病程记录及时性");
    expect(compare.deptA).toBe("心内科");
    expect(compare.deptB).toBe("普外科");
    expect(compare.ruleName).toBe("病程记录及时性");
  });
});

describe("compareRuleSets B 通过率更高", () => {
  // 手算：setA={dept:'心内科', passRate:85, ruleCount:20}, setB={dept:'普外科', passRate:92, ruleCount:25}
  // 手算：passRateDiff=92-85=7.0（保留 1 位小数）
  // 手算：ruleCountDiff=25-20=5
  // 手算：setB.passRate(92) >= setA.passRate(85) → betterDept='普外科'
  it("setA={dept:'心内科',passRate:85,ruleCount:20}, setB={dept:'普外科',passRate:92,ruleCount:25} → passRateDiff=7.0, ruleCountDiff=5, betterDept='普外科'", () => {
    const setA: RuleSetV14 = { dept: "心内科", passRate: 85, ruleCount: 20 };
    const setB: RuleSetV14 = { dept: "普外科", passRate: 92, ruleCount: 25 };
    const result = compareRuleSets(setA, setB);
    expect(result.passRateDiff).toBe(7.0);
    expect(result.ruleCountDiff).toBe(5);
    expect(result.betterDept).toBe("普外科");
  });
});

describe("compareRuleSets A 通过率更高", () => {
  // 手算：setA={dept:'心内科', passRate:92, ruleCount:25}, setB={dept:'普外科', passRate:85, ruleCount:20}
  // 手算：passRateDiff=85-92=-7.0（保留 1 位小数）
  // 手算：ruleCountDiff=20-25=-5
  // 手算：setB.passRate(85) < setA.passRate(92) → betterDept='心内科'
  it("setA={dept:'心内科',passRate:92,ruleCount:25}, setB={dept:'普外科',passRate:85,ruleCount:20} → passRateDiff=-7.0, ruleCountDiff=-5, betterDept='心内科'", () => {
    const setA: RuleSetV14 = { dept: "心内科", passRate: 92, ruleCount: 25 };
    const setB: RuleSetV14 = { dept: "普外科", passRate: 85, ruleCount: 20 };
    const result = compareRuleSets(setA, setB);
    expect(result.passRateDiff).toBe(-7.0);
    expect(result.ruleCountDiff).toBe(-5);
    expect(result.betterDept).toBe("心内科");
  });
});

describe("buildRuleCompareReport 构建报告", () => {
  // 手算：{passRateDiff:7.0, betterDept:'普外科'} → conclusion 包含 '普外科'
  it("{passRateDiff:7.0, betterDept:'普外科'} → conclusion 包含'普外科'", () => {
    const report = buildRuleCompareReport({ passRateDiff: 7.0, betterDept: "普外科" });
    expect(report.conclusion).toContain("普外科");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-rule-compare auth:true", () => {
    const def = (emrQcRuleCompareV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-rule-compare");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
