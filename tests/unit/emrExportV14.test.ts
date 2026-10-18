/**
 * 健澜科技 jlmedaios - 病历数据导出与区域上报 V14 单测（M463-C）
 *
 * 测试 buildExportPayload patientName 脱敏为"张*"、含 hospitalCode、validateExportSchema 完整→valid=true、缺 patientId→valid=false、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildExportPayload,
  validateExportSchema,
  type ExportRecordInputV14,
} from "../../src/bff/aggregators/emrExportV14Aggregator";
import { emrExportV14Routes } from "../../src/bff/routes/emrExportV14";
import type { RouteDef } from "../../src/bff/types";

const fullInput: ExportRecordInputV14 = {
  patientId: "P001",
  patientName: "张三",
  hospitalCode: "HOSP001",
  recordType: "admission",
  diagnoses: ["社区获得性肺炎"],
};

describe("buildExportPayload patientName 脱敏", () => {
  // 手算：双字名"张三"→保留姓"张"+"*"→"张*"
  it("patientName 脱敏为'张*'", () => {
    const payload = buildExportPayload(fullInput);
    expect(payload.patientName).toBe("张*");
  });
});

describe("buildExportPayload 含 hospitalCode", () => {
  // 手算：hospitalCode 原样透传 "HOSP001"
  it("含 hospitalCode", () => {
    const payload = buildExportPayload(fullInput);
    expect(payload.hospitalCode).toBe("HOSP001");
  });
});

describe("validateExportSchema 完整报文", () => {
  // 手算：patientId/hospitalCode/recordType 均非空 → valid=true, missing=[]
  it("完整报文 → valid=true, missing=[]", () => {
    const payload = buildExportPayload(fullInput);
    const result = validateExportSchema(payload);
    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
  });
});

describe("validateExportSchema 缺 patientId", () => {
  // 手算：patientId 为空字符串 → missing 含 'patientId'，valid=false
  it("缺 patientId → valid=false, missing 含 'patientId'", () => {
    const input: ExportRecordInputV14 = { ...fullInput, patientId: "" };
    const payload = buildExportPayload(input);
    const result = validateExportSchema(payload);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain("patientId");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-export auth:true", () => {
    const def = (emrExportV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-export");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
