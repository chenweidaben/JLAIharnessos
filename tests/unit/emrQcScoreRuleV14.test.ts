/**
 * 健澜科技 jlmedaios - 质控评分规则配置 V14 单测（M492-A）
 *
 * 测试 buildScoreRule 构建、aggregateScoreRules 聚合、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildScoreRule,
  aggregateScoreRules,
  type ScoreRuleV14,
} from "../../src/bff/aggregators/emrQcScoreRuleV14Aggregator";
import { emrQcScoreRuleV14Routes } from "../../src/bff/routes/emrQcScoreRuleV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildScoreRule R001", () => {
  // 手算：id='R001', name='完整性', weight=30 → 正确构建
  it("id='R001', name='完整性', weight=30 → 正确构建", () => {
    const rule: ScoreRuleV14 = buildScoreRule("R001", "完整性", 30);
    expect(rule.id).toBe("R001");
    expect(rule.name).toBe("完整性");
    expect(rule.weight).toBe(30);
  });
});

describe("aggregateScoreRules 3个规则", () => {
  // 手算：3 个规则权重 30/30/40 → count=3, totalWeight=100（30+30+40=100）
  it("3 个规则权重 30/30/40 → count=3, totalWeight=100", () => {
    const rules = [
      { id: "R001", name: "完整性", weight: 30 },
      { id: "R002", name: "及时性", weight: 30 },
      { id: "R003", name: "准确性", weight: 40 },
    ];
    const result = aggregateScoreRules(rules);
    expect(result.count).toBe(3);
    expect(result.totalWeight).toBe(100);
  });
});

describe("aggregateScoreRules 空数组", () => {
  // 手算：空数组 → count=0, totalWeight=0
  it("空数组 → count=0, totalWeight=0", () => {
    const rules: { id: string; name: string; weight: number }[] = [];
    const result = aggregateScoreRules(rules);
    expect(result.count).toBe(0);
    expect(result.totalWeight).toBe(0);
  });
});

describe("buildScoreRule R002", () => {
  // 手算：id='R002', name='及时性', weight=20 → 正确构建
  it("id='R002', name='及时性', weight=20 → 正确构建", () => {
    const rule: ScoreRuleV14 = buildScoreRule("R002", "及时性", 20);
    expect(rule.id).toBe("R002");
    expect(rule.name).toBe("及时性");
    expect(rule.weight).toBe(20);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-score-rule auth:true", () => {
    const def = (emrQcScoreRuleV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-score-rule");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
