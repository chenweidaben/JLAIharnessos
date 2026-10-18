/**
 * 健澜科技 jlmedaios - 规则质控可视化配置 V14 单测（M461-B）
 *
 * 测试规则列表返回数≥5、toggle 启用/停用后 enabledCount 变化、weight 调整后该规则 weight 更新、weight 超出 0-100 被 clamp 到边界、读路由 GET auth:true。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeQcRuleConfigListV14,
  computeQcRuleConfigToggleV14,
  computeQcRuleConfigWeightV14,
  DEFAULT_QC_RULE_CONFIG_V14,
  type QcRuleConfigV14,
} from "../../src/bff/aggregators/qcRuleConfigV14Aggregator";
import { qcRuleConfigV14Routes } from "../../src/bff/routes/qcRuleConfigV14";
import type { RouteDef } from "../../src/bff/types";

describe("规则列表返回数", () => {
  it("规则列表返回数 ≥ 5", () => {
    const list = computeQcRuleConfigListV14();
    expect(list.length).toBeGreaterThanOrEqual(5);
  });
});

describe("toggle 启用/停用", () => {
  // 手算：默认 6 条全 enabled=true（DEFAULT_QC_RULE_CONFIG_V14），toggle CR-001 为 false → enabledCount = 6-1 = 5
  it("toggle CR-001 为 false → enabledCount = 5", () => {
    const rules: QcRuleConfigV14[] = DEFAULT_QC_RULE_CONFIG_V14.map((r) => ({ ...r }));
    const result = computeQcRuleConfigToggleV14(rules, "CR-001", false);
    expect(result.changedCount).toBe(1);
    const enabledCount = result.list.filter((r) => r.enabled).length;
    expect(enabledCount).toBe(5);
  });
});

describe("weight 调整", () => {
  it("weight 调整为 50 → 该规则 weight = 50", () => {
    const rules: QcRuleConfigV14[] = DEFAULT_QC_RULE_CONFIG_V14.map((r) => ({ ...r }));
    const result = computeQcRuleConfigWeightV14(rules, "CR-001", 50);
    const target = result.list.find((r) => r.ruleId === "CR-001");
    expect(target?.weight).toBe(50);
  });
});

describe("weight 超出 0-100 被 clamp", () => {
  it("weight=-10 → clamp 到 0；weight=150 → clamp 到 100", () => {
    const rules: QcRuleConfigV14[] = DEFAULT_QC_RULE_CONFIG_V14.map((r) => ({ ...r }));
    const lowResult = computeQcRuleConfigWeightV14(rules, "CR-001", -10);
    expect(lowResult.weight).toBe(0);
    const highResult = computeQcRuleConfigWeightV14(rules, "CR-001", 150);
    expect(highResult.weight).toBe(100);
  });
});

describe("读路由", () => {
  it("GET /api/v1/qc-rule-config auth:true", () => {
    const def = (qcRuleConfigV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/qc-rule-config");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
