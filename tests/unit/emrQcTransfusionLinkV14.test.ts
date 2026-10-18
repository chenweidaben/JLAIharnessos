/**
 * 健澜科技 jlmedaios - 质控-输血记录联动 V14 单测（M514-B）
 *
 * 测试 buildTransfusionLink 构建联动数据、checkTransfusionConsistency 检查输血一致性、buildTransfusionLinkReport 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildTransfusionLink,
  buildTransfusionLinkReport,
  checkTransfusionConsistency,
  type TransfusionConsistencyRecordV14,
} from "../../src/bff/aggregators/emrQcTransfusionLinkV14Aggregator";
import { emrQcTransfusionLinkV14Routes } from "../../src/bff/routes/emrQcTransfusionLinkV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildTransfusionLink 构建联动数据", () => {
  // 手算：recordId='REC006', bloodType='O型', units=2 → 正确构建
  it("recordId='REC006', bloodType='O型', units=2 → 正确构建", () => {
    const link = buildTransfusionLink("REC006", "O型", 2);
    expect(link.recordId).toBe("REC006");
    expect(link.bloodType).toBe("O型");
    expect(link.units).toBe(2);
  });
});

describe("checkTransfusionConsistency 全部通过", () => {
  // 手算：三个字段都 true → pass=true, defects=[]
  it("{hasConsent:true, hasCrossmatch:true, hasTransfusionRecord:true} → pass=true, defects=[]", () => {
    const record: TransfusionConsistencyRecordV14 = { hasConsent: true, hasCrossmatch: true, hasTransfusionRecord: true };
    const result = checkTransfusionConsistency(record);
    expect(result.pass).toBe(true);
    expect(result.defects.length).toBe(0);
  });
});

describe("checkTransfusionConsistency 缺输血同意书", () => {
  // 手算：hasConsent=false → pass=false, defects 包含'缺输血同意书'
  it("{hasConsent:false, hasCrossmatch:true, hasTransfusionRecord:true} → pass=false, defects 包含'缺输血同意书'", () => {
    const record: TransfusionConsistencyRecordV14 = { hasConsent: false, hasCrossmatch: true, hasTransfusionRecord: true };
    const result = checkTransfusionConsistency(record);
    expect(result.pass).toBe(false);
    expect(result.defects).toContain("缺输血同意书");
  });
});

describe("buildTransfusionLinkReport 两条缺陷", () => {
  // 手算：{pass:false, defects:['缺输血同意书','缺交叉配血记录']} → defectCount=2（数组长度）
  it("{pass:false, defects:['缺输血同意书','缺交叉配血记录']} → defectCount=2", () => {
    const report = buildTransfusionLinkReport({ pass: false, defects: ["缺输血同意书", "缺交叉配血记录"] });
    expect(report.defectCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-transfusion-link auth:true", () => {
    const def = (emrQcTransfusionLinkV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-transfusion-link");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
