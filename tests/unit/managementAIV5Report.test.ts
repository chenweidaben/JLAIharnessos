/**
 * 健澜科技 jlmedaios - AI 管理决策助手 V5 纯函数单测（M259-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildManagementAIV5Report,
  detectOperationsAnomalyV5,
  simulateDecisionV5,
} from "../../src/bff/aggregators/managementAIV5ReportAggregator";

describe("detectOperationsAnomalyV5", () => {
  it("值偏离均值3个标准差 → 异常", () => {
    expect(detectOperationsAnomalyV5({ value: 130 }, { mean: 100, std: 10 }).anomaly).toBe(true);
  });
});

describe("simulateDecisionV5", () => {
  it("投资100回报300 → NPV200推荐", () => {
    expect(simulateDecisionV5("扩建", { investment: 100, expectedReturn: 300 }).recommendation).toBe("推荐");
  });
});

describe("buildManagementAIV5Report", () => {
  it("生成洞察数据", () => {
    const r = buildManagementAIV5Report("30d");
    expect(r.insight.outpatient).toBeGreaterThan(0);
  });

  it("生成报告数据", () => {
    const r = buildManagementAIV5Report("30d");
    expect(r.report.weekly).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildManagementAIV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
