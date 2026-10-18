/**
 * 健澜科技 jlmedaios - 质控指标采集 V14 单测（M483-A）
 *
 * 测试 buildCollectTask 构建、collectQcMetric 执行采集、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildCollectTask,
  collectQcMetric,
  type CollectTaskV14,
} from "../../src/bff/aggregators/emrQcMetricCollectV14Aggregator";
import { emrQcMetricCollectV14Routes } from "../../src/bff/routes/emrQcMetricCollectV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildCollectTask 构建", () => {
  // 手算：taskName='病历完整率采集', source='EMR系统' → 正确构建
  it("taskName=病历完整率采集, source=EMR系统 → 正确构建", () => {
    const task: CollectTaskV14 = buildCollectTask("病历完整率采集", "EMR系统");
    expect(task.taskName).toBe("病历完整率采集");
    expect(task.source).toBe("EMR系统");
  });
});

describe("collectQcMetric 1000条", () => {
  // 手算：records=1000 → collectedRecords=1000
  it("records=1000 → collectedRecords=1000", () => {
    const task: CollectTaskV14 = buildCollectTask("病历完整率采集", "EMR系统");
    const result = collectQcMetric(task, 1000);
    expect(result.collectedRecords).toBe(1000);
  });
});

describe("collectQcMetric 0条", () => {
  // 手算：records=0 → collectedRecords=0
  it("records=0 → collectedRecords=0", () => {
    const task: CollectTaskV14 = buildCollectTask("病历完整率采集", "EMR系统");
    const result = collectQcMetric(task, 0);
    expect(result.collectedRecords).toBe(0);
  });
});

describe("buildCollectTask 缺陷率", () => {
  // 手算：taskName='缺陷率采集' → 正确构建
  it("taskName=缺陷率采集 → 正确构建", () => {
    const task: CollectTaskV14 = buildCollectTask("缺陷率采集", "EMR系统");
    expect(task.taskName).toBe("缺陷率采集");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-metric-collect auth:true", () => {
    const def = (emrQcMetricCollectV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-metric-collect");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
