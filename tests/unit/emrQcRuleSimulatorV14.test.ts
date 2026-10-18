/**
 * 健澜科技 jlmedaios - 质控规则模拟测试 V14 单测（M519-C）
 *
 * 测试 buildRuleSimulator 构建模拟器、runRuleSimulation 运行模拟、buildRuleSimulatorReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildRuleSimulator,
  buildRuleSimulatorReport,
  runRuleSimulation,
  type SimulationResultsV14,
} from "../../src/bff/aggregators/emrQcRuleSimulatorV14Aggregator";
import { emrQcRuleSimulatorV14Routes } from "../../src/bff/routes/emrQcRuleSimulatorV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildRuleSimulator 构建模拟器", () => {
  // 手算：ruleName='病程记录及时性', testCases=50 → 正确构建
  it("ruleName='病程记录及时性', testCases=50 → 正确构建", () => {
    const simulator = buildRuleSimulator("病程记录及时性", 50);
    expect(simulator.ruleName).toBe("病程记录及时性");
    expect(simulator.testCases).toBe(50);
  });
});

describe("runRuleSimulation 运行模拟", () => {
  // 手算：results={pass:45, fail:5} → total=50
  // 手算：passRate=45/50×100=90.0（保留 1 位小数）；failCount=5
  it("simulator={...}, results={pass:45, fail:5} → passRate=90.0, failCount=5", () => {
    const simulator = buildRuleSimulator("病程记录及时性", 50);
    const results: SimulationResultsV14 = { pass: 45, fail: 5 };
    const result = runRuleSimulation(simulator, results);
    expect(result.passRate).toBe(90.0);
    expect(result.failCount).toBe(5);
  });
});

describe("buildRuleSimulatorReport 构建报告", () => {
  // 手算：passRate=90.0 >= 90 → status='通过'
  it("{passRate:90.0, failCount:5} → status='通过'", () => {
    const report = buildRuleSimulatorReport({ passRate: 90.0, failCount: 5 });
    expect(report.status).toBe("通过");
  });
});

describe("runRuleSimulation 分母为 0 边界", () => {
  // 手算：results={pass:0, fail:0} → total=0
  // 手算：分母为 0 → passRate=0；failCount=0
  it("results={pass:0, fail:0} → passRate=0, failCount=0", () => {
    const simulator = buildRuleSimulator("病程记录及时性", 50);
    const results: SimulationResultsV14 = { pass: 0, fail: 0 };
    const result = runRuleSimulation(simulator, results);
    expect(result.passRate).toBe(0);
    expect(result.failCount).toBe(0);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-rule-simulator auth:true", () => {
    const def = (emrQcRuleSimulatorV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-rule-simulator");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
