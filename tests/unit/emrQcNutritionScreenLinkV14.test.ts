/**
 * 健澜科技 jlmedaios - 质控-营养风险筛查联动 V14 单测（M517-D，M517 收官）
 *
 * 测试 buildNutritionScreenLink 构建联动数据、checkNutritionScreenConsistency 检查营养筛查一致性、buildNutritionScreenLinkReport 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildNutritionScreenLink,
  buildNutritionScreenLinkReport,
  checkNutritionScreenConsistency,
  type NutritionScreenConsistencyRecordV14,
} from "../../src/bff/aggregators/emrQcNutritionScreenLinkV14Aggregator";
import { emrQcNutritionScreenLinkV14Routes } from "../../src/bff/routes/emrQcNutritionScreenLinkV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildNutritionScreenLink 构建联动数据", () => {
  // 手算：recordId='REC020', nrs2002Score=5, riskLevel='高风险' → 正确构建
  it("recordId='REC020', nrs2002Score=5, riskLevel='高风险' → 正确构建", () => {
    const link = buildNutritionScreenLink("REC020", 5, "高风险");
    expect(link.recordId).toBe("REC020");
    expect(link.nrs2002Score).toBe(5);
    expect(link.riskLevel).toBe("高风险");
  });
});

describe("checkNutritionScreenConsistency 全部通过", () => {
  // 手算：三个字段都 true → pass=true, defects=[]
  it("{hasScreening:true, hasAssessment:true, hasNutritionPlan:true} → pass=true, defects=[]", () => {
    const record: NutritionScreenConsistencyRecordV14 = { hasScreening: true, hasAssessment: true, hasNutritionPlan: true };
    const result = checkNutritionScreenConsistency(record);
    expect(result.pass).toBe(true);
    expect(result.defects.length).toBe(0);
  });
});

describe("checkNutritionScreenConsistency 缺营养风险筛查记录", () => {
  // 手算：hasScreening=false → pass=false, defects 包含'缺营养风险筛查记录'
  it("{hasScreening:false, hasAssessment:true, hasNutritionPlan:true} → pass=false, defects 包含'缺营养风险筛查记录'", () => {
    const record: NutritionScreenConsistencyRecordV14 = { hasScreening: false, hasAssessment: true, hasNutritionPlan: true };
    const result = checkNutritionScreenConsistency(record);
    expect(result.pass).toBe(false);
    expect(result.defects).toContain("缺营养风险筛查记录");
  });
});

describe("buildNutritionScreenLinkReport 两条缺陷", () => {
  // 手算：{pass:false, defects:['缺营养风险筛查记录','缺营养评估记录']} → defectCount=2（数组长度）
  it("{pass:false, defects:['缺营养风险筛查记录','缺营养评估记录']} → defectCount=2", () => {
    const report = buildNutritionScreenLinkReport({ pass: false, defects: ["缺营养风险筛查记录", "缺营养评估记录"] });
    expect(report.defectCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-nutrition-screen-link auth:true", () => {
    const def = (emrQcNutritionScreenLinkV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-nutrition-screen-link");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
