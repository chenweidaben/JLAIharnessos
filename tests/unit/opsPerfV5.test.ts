/**
 * 健澜科技 jlmedaios - 性能与容量压测 V5 单测（M286-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  analyzePerfV5,
  buildOpsPerfV5Report,
  designLoadV5,
  estimateCapacityV5,
  type PerfRun,
} from "../../src/bff/aggregators/opsPerfV5Aggregator";
import { opsPerfV5Routes } from "../../src/bff/routes/opsPerfV5";

describe("designLoadV5", () => {
  it("基线100峰值400→阶梯[100,200,300,400]", () => {
    const plan = designLoadV5(100, 400);
    expect(plan.stages).toEqual([100, 200, 300, 400]);
    expect(plan.rampUpSec).toBe(120);
  });
});

describe("analyzePerfV5", () => {
  it("P95=2500>2000→识别为瓶颈", () => {
    const runs: PerfRun[] = [
      { scenario: "登录", vusers: 100, durationSec: 60, p95Ms: 2500, p99Ms: 4000, throughput: 500, errorRate: 0.2 },
    ];
    expect(analyzePerfV5(runs).bottlenecks).toEqual(["登录"]);
  });
  it("错误率2%>1%→识别为瓶颈", () => {
    const runs: PerfRun[] = [
      { scenario: "查询", vusers: 100, durationSec: 60, p95Ms: 500, p99Ms: 800, throughput: 500, errorRate: 2 },
    ];
    expect(analyzePerfV5(runs).bottlenecks).toEqual(["查询"]);
  });
});

describe("estimateCapacityV5", () => {
  it("吞吐1000预留30%→安全700→需2实例", () => {
    // 700 / 500 = 1.4 → ceil = 2
    const c = estimateCapacityV5(1000, 0.3);
    expect(c.safeThroughput).toBe(700);
    expect(c.requiredInstances).toBe(2);
  });
});

describe("buildOpsPerfV5Report", () => {
  it("2次压测1瓶颈+2实例", () => {
    const runs: PerfRun[] = [
      { scenario: "a", vusers: 100, durationSec: 60, p95Ms: 2500, p99Ms: 4000, throughput: 500, errorRate: 0.2 },
      { scenario: "b", vusers: 100, durationSec: 60, p95Ms: 300, p99Ms: 500, throughput: 500, errorRate: 0.1 },
    ];
    const r = buildOpsPerfV5Report(runs, 0.3);
    expect(r.totalRuns).toBe(2);
    expect(r.bottleneckCount).toBe(1);
    // 总吞吐 1000，安全 700，需 2 实例
    expect(r.recommendedInstances).toBe(2);
  });
});

describe("opsPerfV5Routes 写权限", () => {
  it("POST /api/v1/ops-perf 路由存在且 auth:true", () => {
    const post = opsPerfV5Routes.find((r) => r.method === "POST" && r.path === "/api/v1/ops-perf");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});
