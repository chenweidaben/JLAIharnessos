/**
 * 健澜科技 jlmedaios - 质控规则可视化编辑器 V14 单测（M519-A）
 *
 * 测试 buildRuleEditor 构建编辑器、validateRuleConfig 校验配置、buildRuleEditorReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildRuleEditor,
  buildRuleEditorReport,
  validateRuleConfig,
  type RuleConfigV14,
} from "../../src/bff/aggregators/emrQcRuleEditorV14Aggregator";
import { emrQcRuleEditorV14Routes } from "../../src/bff/routes/emrQcRuleEditorV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildRuleEditor 构建编辑器", () => {
  // 手算：ruleName='病程记录及时性', category='时限类', severity='major' → 正确构建
  it("ruleName='病程记录及时性', category='时限类', severity='major' → 正确构建", () => {
    const editor = buildRuleEditor("病程记录及时性", "时限类", "major");
    expect(editor.ruleName).toBe("病程记录及时性");
    expect(editor.category).toBe("时限类");
    expect(editor.severity).toBe("major");
  });
});

describe("validateRuleConfig 全部通过", () => {
  // 手算：name 非空、threshold>=0、enabled 布尔 → valid=true, errors=[]
  it("{name:'病程记录及时性', threshold:24, enabled:true} → valid=true, errors=[]", () => {
    const config: RuleConfigV14 = { name: "病程记录及时性", threshold: 24, enabled: true };
    const result = validateRuleConfig(config);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });
});

describe("validateRuleConfig 两个错误", () => {
  // 手算：name='' → '规则名不能为空'；threshold=-1 → '阈值不能为负'
  it("{name:'', threshold:-1, enabled:true} → valid=false, errors 包含'规则名不能为空'和'阈值不能为负'", () => {
    const config: RuleConfigV14 = { name: "", threshold: -1, enabled: true };
    const result = validateRuleConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("规则名不能为空");
    expect(result.errors).toContain("阈值不能为负");
  });
});

describe("buildRuleEditorReport 两个错误", () => {
  // 手算：{valid:false, errors:['规则名不能为空','阈值不能为负']} → errorCount=2（数组长度）
  it("{valid:false, errors:['规则名不能为空','阈值不能为负']} → errorCount=2", () => {
    const report = buildRuleEditorReport({ valid: false, errors: ["规则名不能为空", "阈值不能为负"] });
    expect(report.errorCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-rule-editor auth:true", () => {
    const def = (emrQcRuleEditorV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-rule-editor");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
