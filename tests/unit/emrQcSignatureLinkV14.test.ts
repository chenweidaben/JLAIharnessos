/**
 * 健澜科技 jlmedaios - 质控-电子签名联动 V14 单测（M513-A）
 *
 * 测试 buildSignatureLink 构建联动数据、checkSignatureCompliance 检查签名合规、buildSignatureLinkReport 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildSignatureLink,
  buildSignatureLinkReport,
  checkSignatureCompliance,
  type SignatureComplianceRecordV14,
} from "../../src/bff/aggregators/emrQcSignatureLinkV14Aggregator";
import { emrQcSignatureLinkV14Routes } from "../../src/bff/routes/emrQcSignatureLinkV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildSignatureLink 构建联动数据", () => {
  // 手算：recordId='REC001', doctor='张医生', signed=true → 正确构建
  it("recordId='REC001', doctor='张医生', signed=true → 正确构建", () => {
    const link = buildSignatureLink("REC001", "张医生", true);
    expect(link.recordId).toBe("REC001");
    expect(link.doctor).toBe("张医生");
    expect(link.signed).toBe(true);
  });
});

describe("checkSignatureCompliance 全部通过", () => {
  // 手算：三个字段都 true → pass=true, defects=[]
  it("{hasContent:true, hasSignature:true, hasTimestamp:true} → pass=true, defects=[]", () => {
    const record: SignatureComplianceRecordV14 = { hasContent: true, hasSignature: true, hasTimestamp: true };
    const result = checkSignatureCompliance(record);
    expect(result.pass).toBe(true);
    expect(result.defects.length).toBe(0);
  });
});

describe("checkSignatureCompliance 缺电子签名", () => {
  // 手算：hasSignature=false → pass=false, defects 包含'缺电子签名'
  it("{hasContent:true, hasSignature:false, hasTimestamp:true} → pass=false, defects 包含'缺电子签名'", () => {
    const record: SignatureComplianceRecordV14 = { hasContent: true, hasSignature: false, hasTimestamp: true };
    const result = checkSignatureCompliance(record);
    expect(result.pass).toBe(false);
    expect(result.defects).toContain("缺电子签名");
  });
});

describe("buildSignatureLinkReport 两条缺陷", () => {
  // 手算：{pass:false, defects:['缺电子签名','缺时间戳']} → defectCount=2（数组长度）
  it("{pass:false, defects:['缺电子签名','缺时间戳']} → defectCount=2", () => {
    const report = buildSignatureLinkReport({ pass: false, defects: ["缺电子签名", "缺时间戳"] });
    expect(report.defectCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-signature-link auth:true", () => {
    const def = (emrQcSignatureLinkV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-signature-link");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
