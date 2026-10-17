/**
 * 健澜科技 jlmedaios - FHIR 资源建模与网关 V5 单测（M281-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildFHIRGatewayV5Report,
  buildFHIRResourceV5,
  normalizeFHIRV5,
  validateFHIRV5,
  type FHIRGatewayLog,
} from "../../src/bff/aggregators/fhirGatewayV5Aggregator";
import { fhirGatewayV5Routes } from "../../src/bff/routes/fhirGatewayV5";

describe("buildFHIRResourceV5", () => {
  it("构造Patient资源补meta", () => {
    const r = buildFHIRResourceV5("Patient", { id: "p-001" });
    expect(r.resourceType).toBe("Patient");
    expect(r.id).toBe("p-001");
    expect(r.meta?.versionId).toBe("1");
  });
});

describe("validateFHIRV5", () => {
  it("Patient有效", () => {
    const r = validateFHIRV5(buildFHIRResourceV5("Patient", { id: "p-1" }));
    expect(r.valid).toBe(true);
  });
  it("未知类型报错", () => {
    const r = validateFHIRV5({ resourceType: "Unknown", id: "x" });
    expect(r.valid).toBe(false);
    expect(r.errors.join(",")).toContain("不支持的资源类型");
  });
});

describe("normalizeFHIRV5", () => {
  it("status转小写", () => {
    const r = normalizeFHIRV5(buildFHIRResourceV5("Observation", { id: "o-1", status: "FINAL" }));
    expect(r.status).toBe("final");
  });
});

describe("buildFHIRGatewayV5Report", () => {
  it("3次调用1次500→错误率33.3%", () => {
    const logs: FHIRGatewayLog[] = [
      { endpoint: "/a", method: "GET", resourceType: "Patient", status: 200, latencyMs: 80, caller: "e" },
      { endpoint: "/b", method: "GET", resourceType: "Patient", status: 200, latencyMs: 100, caller: "e" },
      { endpoint: "/c", method: "GET", resourceType: "Observation", status: 500, latencyMs: 300, caller: "e" },
    ];
    const r = buildFHIRGatewayV5Report(logs);
    expect(r.errorRate).toBe(33.3);
    expect(r.totalCalls).toBe(3);
  });
});

describe("fhirGatewayV5Routes 写权限", () => {
  it("POST /api/v1/fhir-gateway/resource 路由存在且 auth:true", () => {
    const post = fhirGatewayV5Routes.find((r) => r.method === "POST" && r.path === "/api/v1/fhir-gateway/resource");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});
