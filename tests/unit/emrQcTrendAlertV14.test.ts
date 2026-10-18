/**
 * 健澜科技 jlmedaios - 病历质控指标趋势预警 V14 单测（M475-A）
 *
 * 测试 evaluateTrendDirection 方向判定、buildTrendAlert 预警生成、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildTrendAlert,
  evaluateTrendDirection,
} from "../../src/bff/aggregators/emrQcTrendAlertV14Aggregator";
import { emrQcTrendAlertV14Routes } from "../../src/bff/routes/emrQcTrendAlertV14";
import type { RouteDef } from "../../src/bff/types";

describe("evaluateTrendDirection 上升", () => {
  // 手算：current=95, previous=90 → 95>90 → direction='up'
  it("current=95, previous=90 → direction='up'", () => {
    expect(evaluateTrendDirection(95, 90)).toBe("up");
  });
});

describe("evaluateTrendDirection 下降", () => {
  // 手算：current=85, previous=90 → 85<90 → direction='down'
  it("current=85, previous=90 → direction='down'", () => {
    expect(evaluateTrendDirection(85, 90)).toBe("down");
  });
});

describe("evaluateTrendDirection 持平", () => {
  // 手算：current=90, previous=90 → 相等 → direction='flat'
  it("current=90, previous=90 → direction='flat'", () => {
    expect(evaluateTrendDirection(90, 90)).toBe("flat");
  });
});

describe("buildTrendAlert 生成", () => {
  // 手算：indicator='通过率', current=95, previous=90 → gap=95-90=5, direction='up'
  it("indicator='通过率', current=95, previous=90 → gap=5, direction='up'", () => {
    const alert = buildTrendAlert("通过率", 95, 90);
    expect(alert.gap).toBe(5);
    expect(alert.direction).toBe("up");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-trend-alert auth:true", () => {
    const def = (emrQcTrendAlertV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-trend-alert");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
