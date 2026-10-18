/**
 * 健澜科技 jlmedaios - 质控-疼痛评估联动 V14 单测（M517-B）
 *
 * 测试 buildPainAssessmentLink 构建联动数据、checkPainAssessmentConsistency 检查疼痛评估一致性、buildPainAssessmentLinkReport 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildPainAssessmentLink,
  buildPainAssessmentLinkReport,
  checkPainAssessmentConsistency,
  type PainAssessmentConsistencyRecordV14,
} from "../../src/bff/aggregators/emrQcPainAssessmentLinkV14Aggregator";
import { emrQcPainAssessmentLinkV14Routes } from "../../src/bff/routes/emrQcPainAssessmentLinkV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildPainAssessmentLink 构建联动数据", () => {
  // 手算：recordId='REC018', painScore=6, painLevel='中度疼痛' → 正确构建
  it("recordId='REC018', painScore=6, painLevel='中度疼痛' → 正确构建", () => {
    const link = buildPainAssessmentLink("REC018", 6, "中度疼痛");
    expect(link.recordId).toBe("REC018");
    expect(link.painScore).toBe(6);
    expect(link.painLevel).toBe("中度疼痛");
  });
});

describe("checkPainAssessmentConsistency 全部通过", () => {
  // 手算：三个字段都 true → pass=true, defects=[]
  it("{hasInitial:true, hasReassessment:true, hasIntervention:true} → pass=true, defects=[]", () => {
    const record: PainAssessmentConsistencyRecordV14 = { hasInitial: true, hasReassessment: true, hasIntervention: true };
    const result = checkPainAssessmentConsistency(record);
    expect(result.pass).toBe(true);
    expect(result.defects.length).toBe(0);
  });
});

describe("checkPainAssessmentConsistency 缺初始疼痛评估记录", () => {
  // 手算：hasInitial=false → pass=false, defects 包含'缺初始疼痛评估记录'
  it("{hasInitial:false, hasReassessment:true, hasIntervention:true} → pass=false, defects 包含'缺初始疼痛评估记录'", () => {
    const record: PainAssessmentConsistencyRecordV14 = { hasInitial: false, hasReassessment: true, hasIntervention: true };
    const result = checkPainAssessmentConsistency(record);
    expect(result.pass).toBe(false);
    expect(result.defects).toContain("缺初始疼痛评估记录");
  });
});

describe("buildPainAssessmentLinkReport 两条缺陷", () => {
  // 手算：{pass:false, defects:['缺初始疼痛评估记录','缺复评记录']} → defectCount=2（数组长度）
  it("{pass:false, defects:['缺初始疼痛评估记录','缺复评记录']} → defectCount=2", () => {
    const report = buildPainAssessmentLinkReport({ pass: false, defects: ["缺初始疼痛评估记录", "缺复评记录"] });
    expect(report.defectCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-pain-assessment-link auth:true", () => {
    const def = (emrQcPainAssessmentLinkV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-pain-assessment-link");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
