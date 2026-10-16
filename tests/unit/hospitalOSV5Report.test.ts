/**
 * 健澜科技 jlmedaios - 医院 OS 底座 V5 纯函数单测（M257-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessOSServices,
  buildHospitalOSV5Report,
  routeOSRequest,
} from "../../src/bff/aggregators/hospitalOSV5ReportAggregator";

describe("assessOSServices", () => {
  it("100服务98健康 → 98%达标", () => {
    expect(assessOSServices({ registered: 100, healthy: 98, degraded: 2 }).adequate).toBe(true);
  });
});

describe("routeOSRequest", () => {
  it("/api/v1/高优先级请求 → critical-cluster 10ms", () => {
    expect(routeOSRequest({ path: "/api/v1/patient", priority: "high" }).target).toBe("critical-cluster");
  });
});

describe("buildHospitalOSV5Report", () => {
  it("生成微服务数据", () => {
    const r = buildHospitalOSV5Report("30d");
    expect(r.microservice.registry).toBeGreaterThan(0);
  });

  it("生成云原生数据", () => {
    const r = buildHospitalOSV5Report("30d");
    expect(r.cloudNative.k8s).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildHospitalOSV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
