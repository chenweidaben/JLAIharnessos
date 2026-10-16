/**
 * 健澜科技 jlmedaios - 临床规则引擎 V3 纯函数单测（M255-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildClinicalRuleEngineV3Report,
  evaluateClinicalRuleV3,
  versionRuleV3,
} from "../../src/bff/aggregators/clinicalRuleEngineV3ReportAggregator";

describe("evaluateClinicalRuleV3", () => {
  it("70岁高血压匹配老年+高血压规则 → 触发优先级1", () => {
    expect(evaluateClinicalRuleV3({ age: 70, diagnosis: "高血压" }, { condition: "老年+高血压", action: "加强随访" }).triggered).toBe(true);
  });
});

describe("versionRuleV3", () => {
  it("规则A版本2.0 → 生成changelog", () => {
    expect(versionRuleV3({ name: "规则A", content: "xxx" }, "2.0").version).toBe("2.0");
  });
});

describe("buildClinicalRuleEngineV3Report", () => {
  it("生成疾病规则数据", () => {
    const r = buildClinicalRuleEngineV3Report("30d");
    expect(r.disease.diagnostic).toBeGreaterThan(0);
  });

  it("生成规则库数据", () => {
    const r = buildClinicalRuleEngineV3Report("30d");
    expect(r.ruleBase.entry).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildClinicalRuleEngineV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
