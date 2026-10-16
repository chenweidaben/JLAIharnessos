/**
 * 健澜科技 jlmedaios - v4.0.0 里程碑纯函数单测（M231-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildV4MilestoneReport,
  buildV4Roadmap,
  summarizeMilestone,
} from "../../src/bff/aggregators/v4MilestoneReportAggregator";

describe("summarizeMilestone", () => {
  it("188提交/1300测试/4版本 → 总结生成", () => {
    const r = summarizeMilestone(188, 1300, 4);
    expect(r.summary).toContain("v4.0.0");
  });
});

describe("buildV4Roadmap", () => {
  it("20特性/2026H1 → 4阶段", () => {
    expect(buildV4Roadmap(20, "2026H1").phases).toBe(4);
  });
});

describe("buildV4MilestoneReport", () => {
  it("生成历程数据", () => {
    const r = buildV4MilestoneReport("all");
    expect(r.journey.slices).toBeGreaterThan(0);
  });

  it("生成架构数据", () => {
    const r = buildV4MilestoneReport("all");
    expect(r.architecture.cloudNative).toBe(true);
  });

  it("生成AI大脑数据", () => {
    const r = buildV4MilestoneReport("all");
    expect(r.aiBrain.version).toBe("2.0");
  });

  it("生成部署数据", () => {
    const r = buildV4MilestoneReport("all");
    expect(r.deployment.k8s).toBe(true);
  });

  it("生成建议", () => {
    const r = buildV4MilestoneReport("all");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
