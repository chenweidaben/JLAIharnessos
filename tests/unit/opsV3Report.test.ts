/**
 * 健澜科技 jlmedaios - 运维管理 V3 纯函数单测（M244-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessSystemAvailabilityV3,
  buildOpsV3Report,
  handleIncidentV3,
} from "../../src/bff/aggregators/opsV3ReportAggregator";

describe("assessSystemAvailabilityV3", () => {
  it("运行525600宕机30 → 99.99%优秀", () => {
    expect(assessSystemAvailabilityV3(525600, 30).excellent).toBe(true);
  });
});

describe("handleIncidentV3", () => {
  it("紧急响应15分钟SLA30 → 达标", () => {
    expect(handleIncidentV3({ priority: "紧急", responseTime: 15 }, { critical: 30, high: 60, medium: 240 }).metSLA).toBe(true);
  });
});

describe("buildOpsV3Report", () => {
  it("生成基础设施数据", () => {
    const r = buildOpsV3Report("30d");
    expect(r.infrastructure.server).toBeGreaterThan(0);
  });

  it("生成监控数据", () => {
    const r = buildOpsV3Report("30d");
    expect(r.monitoring.prometheus).toBeGreaterThanOrEqual(0);
  });

  it("生成建议", () => {
    const r = buildOpsV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
