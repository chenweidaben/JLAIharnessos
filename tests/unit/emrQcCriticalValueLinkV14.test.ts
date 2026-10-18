/**
 * 健澜科技 jlmedaios - 质控-危急值联动 V14 单测（M515-A）
 *
 * 测试 buildCriticalValueLink 构建联动数据、checkCriticalValueConsistency 检查危急值一致性、buildCriticalValueLinkReport 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildCriticalValueLink,
  buildCriticalValueLinkReport,
  checkCriticalValueConsistency,
  type CriticalValueConsistencyRecordV14,
} from "../../src/bff/aggregators/emrQcCriticalValueLinkV14Aggregator";
import { emrQcCriticalValueLinkV14Routes } from "../../src/bff/routes/emrQcCriticalValueLinkV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildCriticalValueLink 构建联动数据", () => {
  // 手算：recordId='REC009', criticalValue='血钾7.2mmol/L', notified=true → 正确构建
  it("recordId='REC009', criticalValue='血钾7.2mmol/L', notified=true → 正确构建", () => {
    const link = buildCriticalValueLink("REC009", "血钾7.2mmol/L", true);
    expect(link.recordId).toBe("REC009");
    expect(link.criticalValue).toBe("血钾7.2mmol/L");
    expect(link.notified).toBe(true);
  });
});

describe("checkCriticalValueConsistency 全部通过", () => {
  // 手算：三个字段都 true → pass=true, defects=[]
  it("{hasReport:true, hasNotification:true, hasDocResponse:true} → pass=true, defects=[]", () => {
    const record: CriticalValueConsistencyRecordV14 = { hasReport: true, hasNotification: true, hasDocResponse: true };
    const result = checkCriticalValueConsistency(record);
    expect(result.pass).toBe(true);
    expect(result.defects.length).toBe(0);
  });
});

describe("checkCriticalValueConsistency 缺危急值通知记录", () => {
  // 手算：hasNotification=false → pass=false, defects 包含'缺危急值通知记录'
  it("{hasReport:true, hasNotification:false, hasDocResponse:true} → pass=false, defects 包含'缺危急值通知记录'", () => {
    const record: CriticalValueConsistencyRecordV14 = { hasReport: true, hasNotification: false, hasDocResponse: true };
    const result = checkCriticalValueConsistency(record);
    expect(result.pass).toBe(false);
    expect(result.defects).toContain("缺危急值通知记录");
  });
});

describe("buildCriticalValueLinkReport 两条缺陷", () => {
  // 手算：{pass:false, defects:['缺危急值通知记录','缺医生响应记录']} → defectCount=2（数组长度）
  it("{pass:false, defects:['缺危急值通知记录','缺医生响应记录']} → defectCount=2", () => {
    const report = buildCriticalValueLinkReport({ pass: false, defects: ["缺危急值通知记录", "缺医生响应记录"] });
    expect(report.defectCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-critical-value-link auth:true", () => {
    const def = (emrQcCriticalValueLinkV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-critical-value-link");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
