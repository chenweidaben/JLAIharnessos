/**
 * 健澜科技 jlmedaios - HL7 / WS363 标准对接升级 V5 单测（M281-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildHl7IntegrationV5Report,
  buildHL7V5,
  parseHL7V5,
  validateWS363V5,
} from "../../src/bff/aggregators/hl7IntegrationV5Aggregator";
import { hl7IntegrationV5Routes } from "../../src/bff/routes/hl7IntegrationV5";

describe("parseHL7V5", () => {
  it("按|分段提取4个字段", () => {
    const m = parseHL7V5("ADT^A01|HOSP-A|EMR|p-001");
    expect(m.messageType).toBe("ADT^A01");
    expect(m.patientId).toBe("p-001");
  });
});

describe("buildHL7V5", () => {
  it("拼接4段以|分隔", () => {
    const s = buildHL7V5("ORU^R01", { sender: "LIS", receiver: "EMR", patientId: "p-002" });
    expect(s).toBe("ORU^R01|LIS|EMR|p-002");
  });
});

describe("validateWS363V5", () => {
  it("4字段齐全→合规", () => {
    const r = validateWS363V5({ patientId: "p1", name: "张三", gender: "男", birthDate: "1990-01-01" });
    expect(r.compliant).toBe(true);
  });
  it("name缺失→不合规", () => {
    const r = validateWS363V5({ patientId: "p1", name: "", gender: "男", birthDate: "1990-01-01" });
    expect(r.compliant).toBe(false);
  });
});

describe("buildHl7IntegrationV5Report", () => {
  it("3次校验2通过→合规率66.7%", () => {
    const r = buildHl7IntegrationV5Report([], [true, true, false]);
    expect(r.ws363ComplianceRate).toBe(66.7);
  });
});

describe("hl7IntegrationV5Routes 写权限", () => {
  it("POST /api/v1/hl7-integration/send 路由存在且 auth:true", () => {
    const post = hl7IntegrationV5Routes.find((r) => r.method === "POST" && r.path === "/api/v1/hl7-integration/send");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});
