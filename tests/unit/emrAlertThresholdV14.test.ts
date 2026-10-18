/**
 * 健澜科技 jlmedaios - 病历质控指标预警阈值配置 V14 单测（M469-A）
 *
 * 测试 evaluateAlert 三态评估（数值越低越危险）、buildAlertSummary 汇总、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAlertSummary,
  evaluateAlert,
  type AlertSummaryItemV14,
} from "../../src/bff/aggregators/emrAlertThresholdV14Aggregator";
import { emrAlertThresholdV14Routes } from "../../src/bff/routes/emrAlertThresholdV14";
import type { RouteDef } from "../../src/bff/types";

describe("evaluateAlert normal", () => {
  // 手算：value=95, warn=90, danger=80 → 95>90>80 → 不触发任何阈值 → 'normal'
  it("value=95, warn=90, danger=80 → 'normal'", () => {
    expect(evaluateAlert(95, { warn: 90, danger: 80 })).toBe("normal");
  });
});

describe("evaluateAlert warn", () => {
  // 手算：value=85, warn=90, danger=80 → 85<=90 但 >80 → 'warn'
  it("value=85, warn=90, danger=80 → 'warn'", () => {
    expect(evaluateAlert(85, { warn: 90, danger: 80 })).toBe("warn");
  });
});

describe("evaluateAlert danger", () => {
  // 手算：value=70, warn=90, danger=80 → 70<=80 → 'danger'
  it("value=70, warn=90, danger=80 → 'danger'", () => {
    expect(evaluateAlert(70, { warn: 90, danger: 80 })).toBe("danger");
  });
});

describe("buildAlertSummary 汇总", () => {
  // 手算：3 项 1 warn 1 danger → warnCount=1, dangerCount=1, total=3
  it("3 项 1 warn 1 danger → warnCount=1，dangerCount=1", () => {
    const items: AlertSummaryItemV14[] = [
      { indicator: "A", value: 95, status: "normal" },
      { indicator: "B", value: 85, status: "warn" },
      { indicator: "C", value: 70, status: "danger" },
    ];
    const summary = buildAlertSummary(items);
    expect(summary.warnCount).toBe(1);
    expect(summary.dangerCount).toBe(1);
    expect(summary.total).toBe(3);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-alert-threshold auth:true", () => {
    const def = (emrAlertThresholdV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-alert-threshold");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
