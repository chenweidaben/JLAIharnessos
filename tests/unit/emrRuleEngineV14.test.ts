/**
 * 健澜科技 jlmedaios - 病历质控规则引擎可视化对接 V14 单测（M467-A）
 *
 * 测试 executeRuleEngine 关键词匹配、buildRuleSummary 汇总统计、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildRuleSummary,
  executeRuleEngine,
  type QcRuleV14,
} from "../../src/bff/aggregators/emrRuleEngineV14Aggregator";
import { emrRuleEngineV14Routes } from "../../src/bff/routes/emrRuleEngineV14";
import type { RouteDef } from "../../src/bff/types";

const rules: QcRuleV14[] = [
  { ruleId: "R001", keyword: "肺炎", message: "肺炎相关提示" },
  { ruleId: "R002", keyword: "高血压", message: "高血压相关提示" },
  { ruleId: "R003", keyword: "糖尿病", message: "糖尿病相关提示" },
];

describe("executeRuleEngine 关键词命中", () => {
  // 手算：note 含"肺炎" → R001 triggered=true，R002/R003 triggered=false
  it("note 含关键词 → 对应规则 triggered=true", () => {
    const results = executeRuleEngine("患者因肺炎入院", rules);
    expect(results[0]?.triggered).toBe(true);
    expect(results[1]?.triggered).toBe(false);
  });
});

describe("executeRuleEngine 无关键词命中", () => {
  // 手算：note 不含任何关键词 → 全部 triggered=false
  it("note 不含关键词 → triggered=false", () => {
    const results = executeRuleEngine("患者一切正常", rules);
    expect(results.every((r) => !r.triggered)).toBe(true);
  });
});

describe("buildRuleSummary 触发计数", () => {
  // 手算：3 条规则触发 1 条 → triggeredCount=1, total=3
  it("3 条规则触发 1 条 → triggeredCount=1，total=3", () => {
    const results = executeRuleEngine("患者因肺炎入院", rules);
    const summary = buildRuleSummary(results);
    expect(summary.total).toBe(3);
    expect(summary.triggeredCount).toBe(1);
  });
});

describe("buildRuleSummary 通过率", () => {
  // 手算：4 条规则触发 2 条（肺炎+高血压）→ 2/4×100 = 50%
  it("触发 2/4 → passRate=50", () => {
    const fourRules: QcRuleV14[] = [
      ...rules,
      { ruleId: "R004", keyword: "冠心病", message: "冠心病提示" },
    ];
    const results = executeRuleEngine("患者因肺炎和高血压入院", fourRules);
    const summary = buildRuleSummary(results);
    expect(summary.passRate).toBe(50);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-rule-engine auth:true", () => {
    const def = (emrRuleEngineV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-rule-engine");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
