/**
 * 健澜科技 jlmedaios - 质控-压疮风险评估联动 V14 单测（M517-C）
 *
 * 测试 buildPressureUlcerLink 构建联动数据、checkPressureUlcerConsistency 检查压疮评估一致性、buildPressureUlcerLinkReport 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildPressureUlcerLink,
  buildPressureUlcerLinkReport,
  checkPressureUlcerConsistency,
  type PressureUlcerConsistencyRecordV14,
} from "../../src/bff/aggregators/emrQcPressureUlcerLinkV14Aggregator";
import { emrQcPressureUlcerLinkV14Routes } from "../../src/bff/routes/emrQcPressureUlcerLinkV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildPressureUlcerLink 构建联动数据", () => {
  // 手算：recordId='REC019', bradenScore=14, riskLevel='中度风险' → 正确构建
  it("recordId='REC019', bradenScore=14, riskLevel='中度风险' → 正确构建", () => {
    const link = buildPressureUlcerLink("REC019", 14, "中度风险");
    expect(link.recordId).toBe("REC019");
    expect(link.bradenScore).toBe(14);
    expect(link.riskLevel).toBe("中度风险");
  });
});

describe("checkPressureUlcerConsistency 全部通过", () => {
  // 手算：三个字段都 true → pass=true, defects=[]
  it("{hasInitial:true, hasReassessment:true, hasPrevention:true} → pass=true, defects=[]", () => {
    const record: PressureUlcerConsistencyRecordV14 = { hasInitial: true, hasReassessment: true, hasPrevention: true };
    const result = checkPressureUlcerConsistency(record);
    expect(result.pass).toBe(true);
    expect(result.defects.length).toBe(0);
  });
});

describe("checkPressureUlcerConsistency 缺初始压疮风险评估记录", () => {
  // 手算：hasInitial=false → pass=false, defects 包含'缺初始压疮风险评估记录'
  it("{hasInitial:false, hasReassessment:true, hasPrevention:true} → pass=false, defects 包含'缺初始压疮风险评估记录'", () => {
    const record: PressureUlcerConsistencyRecordV14 = { hasInitial: false, hasReassessment: true, hasPrevention: true };
    const result = checkPressureUlcerConsistency(record);
    expect(result.pass).toBe(false);
    expect(result.defects).toContain("缺初始压疮风险评估记录");
  });
});

describe("buildPressureUlcerLinkReport 两条缺陷", () => {
  // 手算：{pass:false, defects:['缺初始压疮风险评估记录','缺复评记录']} → defectCount=2（数组长度）
  it("{pass:false, defects:['缺初始压疮风险评估记录','缺复评记录']} → defectCount=2", () => {
    const report = buildPressureUlcerLinkReport({ pass: false, defects: ["缺初始压疮风险评估记录", "缺复评记录"] });
    expect(report.defectCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-pressure-ulcer-link auth:true", () => {
    const def = (emrQcPressureUlcerLinkV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-pressure-ulcer-link");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
