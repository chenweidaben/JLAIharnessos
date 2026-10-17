/**
 * 健澜科技 jlmedaios - 灰度发布与回滚 V5 单测（M286-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildOpsReleaseV5Report,
  planCanaryV5,
  rollbackPlanV5,
  routeCohortV5,
  type ReleaseDeploy,
} from "../../src/bff/aggregators/opsReleaseV5Aggregator";
import { opsReleaseV5Routes } from "../../src/bff/routes/opsReleaseV5";

describe("planCanaryV5", () => {
  it("目标25%→阶段[5,10,20,25]", () => {
    const p = planCanaryV5("v1.0.0", 25);
    expect(p.steps).toEqual([5, 10, 20, 25]);
  });
});

describe("routeCohortV5", () => {
  it("pct=100%→所有用户进canary", () => {
    const r = routeCohortV5(["u1", "u2", "u3"], 100);
    expect(r.canary.length).toBe(3);
    expect(r.stable.length).toBe(0);
  });
  it("pct=0%→所有用户进stable", () => {
    const r = routeCohortV5(["u1", "u2"], 0);
    expect(r.stable.length).toBe(2);
  });
});

describe("rollbackPlanV5", () => {
  it("high严重度→10分钟全量回滚", () => {
    const p = rollbackPlanV5({ severity: "high", affectedUsers: 1000 });
    expect(p.estimatedMinutes).toBe(10);
    expect(p.action).toContain("回滚");
  });
  it("low严重度→观察热修复", () => {
    const p = rollbackPlanV5({ severity: "low", affectedUsers: 10 });
    expect(p.action).toContain("热修复");
  });
});

describe("buildOpsReleaseV5Report", () => {
  it("1回滚1灰度中", () => {
    const deploys: ReleaseDeploy[] = [
      { id: "1", version: "v1", strategy: "canary", canaryPct: 10, status: "routing" },
      { id: "2", version: "v2", strategy: "canary", canaryPct: 0, status: "rolled-back" },
    ];
    const r = buildOpsReleaseV5Report(deploys);
    expect(r.totalDeploys).toBe(2);
    expect(r.rolledBackCount).toBe(1);
    expect(r.canaryActive).toBe(1);
  });
});

describe("opsReleaseV5Routes 写权限", () => {
  it("POST /api/v1/ops-release 路由存在且 auth:true", () => {
    const post = opsReleaseV5Routes.find((r) => r.method === "POST" && r.path === "/api/v1/ops-release");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});
