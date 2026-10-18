/**
 * 健澜科技 jlmedaios - 质控指标预警 V14 单测（M483-C）
 *
 * 测试 buildAlertRule 构建、checkMetricAlert 预警检查、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAlertRule,
  checkMetricAlert,
  type AlertRuleV14,
} from "../../src/bff/aggregators/emrQcMetricAlertV14Aggregator";
import { emrQcMetricAlertV14Routes } from "../../src/bff/routes/emrQcMetricAlertV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAlertRule 构建", () => {
  // 手算：metricName='完整率', threshold=90, direction='below' → 正确构建
  it("metricName=完整率, threshold=90, direction=below → 正确构建", () => {
    const rule: AlertRuleV14 = buildAlertRule("完整率", 90, "below");
    expect(rule.metricName).toBe("完整率");
    expect(rule.threshold).toBe(90);
    expect(rule.direction).toBe("below");
  });
});

describe("checkMetricAlert below 触发", () => {
  // 手算：rule threshold=90 direction='below', currentValue=85 → 85<90 → triggered=true
  it("rule threshold=90 direction=below, currentValue=85 → triggered=true", () => {
    const rule: AlertRuleV14 = buildAlertRule("完整率", 90, "below");
    const result = checkMetricAlert(rule, 85);
    expect(result.triggered).toBe(true);
  });
});

describe("checkMetricAlert below 未触发", () => {
  // 手算：rule threshold=90 direction='below', currentValue=95 → 95>=90 → triggered=false
  it("rule threshold=90 direction=below, currentValue=95 → triggered=false", () => {
    const rule: AlertRuleV14 = buildAlertRule("完整率", 90, "below");
    const result = checkMetricAlert(rule, 95);
    expect(result.triggered).toBe(false);
  });
});

describe("checkMetricAlert above 触发", () => {
  // 手算：rule threshold=5 direction='above', currentValue=8 → 8>5 → triggered=true
  it("rule threshold=5 direction=above, currentValue=8 → triggered=true", () => {
    const rule: AlertRuleV14 = buildAlertRule("缺陷率", 5, "above");
    const result = checkMetricAlert(rule, 8);
    expect(result.triggered).toBe(true);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-metric-alert auth:true", () => {
    const def = (emrQcMetricAlertV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-metric-alert");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
