/**
 * 健澜科技 jlmedaios - 质控科室预警阈值 V14 单测（M495-B）
 *
 * 测试 buildAlertThreshold 构建、checkAlertThreshold 检查、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAlertThreshold,
  checkAlertThreshold,
  type AlertThresholdV14,
} from "../../src/bff/aggregators/emrQcAlertThresholdV14Aggregator";
import { emrQcAlertThresholdV14Routes } from "../../src/bff/routes/emrQcAlertThresholdV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAlertThreshold 内科缺陷率", () => {
  // 手算：dept='内科', metric='缺陷率', threshold=5 → 正确构建
  it("dept='内科', metric='缺陷率', threshold=5 → 正确构建", () => {
    const threshold: AlertThresholdV14 = buildAlertThreshold("内科", "缺陷率", 5);
    expect(threshold.dept).toBe("内科");
    expect(threshold.metric).toBe("缺陷率");
    expect(threshold.threshold).toBe(5);
  });
});

describe("checkAlertThreshold 触发", () => {
  // 手算：actual=8, threshold=5 → alerted=true（8>5）
  it("actual=8, threshold=5 → alerted=true", () => {
    const result = checkAlertThreshold("内科", "缺陷率", 8, 5);
    expect(result.alerted).toBe(true);
  });
});

describe("checkAlertThreshold 正常", () => {
  // 手算：actual=3, threshold=5 → alerted=false（3<5）
  it("actual=3, threshold=5 → alerted=false", () => {
    const result = checkAlertThreshold("内科", "缺陷率", 3, 5);
    expect(result.alerted).toBe(false);
  });
});

describe("checkAlertThreshold 等于不触发", () => {
  // 手算：actual=5, threshold=5 → alerted=false（5=5，不触发）
  it("actual=5, threshold=5 → alerted=false", () => {
    const result = checkAlertThreshold("内科", "缺陷率", 5, 5);
    expect(result.alerted).toBe(false);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-alert-threshold auth:true", () => {
    const def = (emrQcAlertThresholdV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-alert-threshold");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
