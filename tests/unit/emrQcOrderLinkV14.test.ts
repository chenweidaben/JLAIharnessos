/**
 * 健澜科技 jlmedaios - 质控-医嘱联动 V14 单测（M513-B）
 *
 * 测试 buildOrderLink 构建联动数据、checkOrderConsistency 检查医嘱一致性、buildOrderLinkReport 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildOrderLink,
  buildOrderLinkReport,
  checkOrderConsistency,
  type OrderConsistencyRecordV14,
} from "../../src/bff/aggregators/emrQcOrderLinkV14Aggregator";
import { emrQcOrderLinkV14Routes } from "../../src/bff/routes/emrQcOrderLinkV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildOrderLink 构建联动数据", () => {
  // 手算：recordId='REC002', orderCount=5, status='已审核' → 正确构建
  it("recordId='REC002', orderCount=5, status='已审核' → 正确构建", () => {
    const link = buildOrderLink("REC002", 5, "已审核");
    expect(link.recordId).toBe("REC002");
    expect(link.orderCount).toBe(5);
    expect(link.status).toBe("已审核");
  });
});

describe("checkOrderConsistency 全部通过", () => {
  // 手算：三个字段都 true → pass=true, defects=[]
  it("{hasDiagnosis:true, hasOrder:true, hasSignature:true} → pass=true, defects=[]", () => {
    const record: OrderConsistencyRecordV14 = { hasDiagnosis: true, hasOrder: true, hasSignature: true };
    const result = checkOrderConsistency(record);
    expect(result.pass).toBe(true);
    expect(result.defects.length).toBe(0);
  });
});

describe("checkOrderConsistency 缺医嘱", () => {
  // 手算：hasOrder=false → pass=false, defects 包含'缺医嘱'
  it("{hasDiagnosis:true, hasOrder:false, hasSignature:true} → pass=false, defects 包含'缺医嘱'", () => {
    const record: OrderConsistencyRecordV14 = { hasDiagnosis: true, hasOrder: false, hasSignature: true };
    const result = checkOrderConsistency(record);
    expect(result.pass).toBe(false);
    expect(result.defects).toContain("缺医嘱");
  });
});

describe("buildOrderLinkReport 两条缺陷", () => {
  // 手算：{pass:false, defects:['缺医嘱','缺诊断']} → defectCount=2（数组长度）
  it("{pass:false, defects:['缺医嘱','缺诊断']} → defectCount=2", () => {
    const report = buildOrderLinkReport({ pass: false, defects: ["缺医嘱", "缺诊断"] });
    expect(report.defectCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-order-link auth:true", () => {
    const def = (emrQcOrderLinkV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-order-link");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
