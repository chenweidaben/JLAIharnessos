/**
 * 健澜科技 jlmedaios - 质控-护理评估单联动 V14 单测（M517-A）
 *
 * 测试 buildNursingAssessmentLink 构建联动数据、checkNursingAssessmentConsistency 检查护理评估一致性、buildNursingAssessmentLinkReport 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildNursingAssessmentLink,
  buildNursingAssessmentLinkReport,
  checkNursingAssessmentConsistency,
  type NursingAssessmentConsistencyRecordV14,
} from "../../src/bff/aggregators/emrQcNursingAssessmentLinkV14Aggregator";
import { emrQcNursingAssessmentLinkV14Routes } from "../../src/bff/routes/emrQcNursingAssessmentLinkV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildNursingAssessmentLink 构建联动数据", () => {
  // 手算：recordId='REC017', nurse='李护士', assessmentType='入院评估' → 正确构建
  it("recordId='REC017', nurse='李护士', assessmentType='入院评估' → 正确构建", () => {
    const link = buildNursingAssessmentLink("REC017", "李护士", "入院评估");
    expect(link.recordId).toBe("REC017");
    expect(link.nurse).toBe("李护士");
    expect(link.assessmentType).toBe("入院评估");
  });
});

describe("checkNursingAssessmentConsistency 全部通过", () => {
  // 手算：三个字段都 true → pass=true, defects=[]
  it("{hasAdmission:true, hasPeriodic:true, hasDischarge:true} → pass=true, defects=[]", () => {
    const record: NursingAssessmentConsistencyRecordV14 = { hasAdmission: true, hasPeriodic: true, hasDischarge: true };
    const result = checkNursingAssessmentConsistency(record);
    expect(result.pass).toBe(true);
    expect(result.defects.length).toBe(0);
  });
});

describe("checkNursingAssessmentConsistency 缺入院护理评估记录", () => {
  // 手算：hasAdmission=false → pass=false, defects 包含'缺入院护理评估记录'
  it("{hasAdmission:false, hasPeriodic:true, hasDischarge:true} → pass=false, defects 包含'缺入院护理评估记录'", () => {
    const record: NursingAssessmentConsistencyRecordV14 = { hasAdmission: false, hasPeriodic: true, hasDischarge: true };
    const result = checkNursingAssessmentConsistency(record);
    expect(result.pass).toBe(false);
    expect(result.defects).toContain("缺入院护理评估记录");
  });
});

describe("buildNursingAssessmentLinkReport 两条缺陷", () => {
  // 手算：{pass:false, defects:['缺入院护理评估记录','缺定期评估记录']} → defectCount=2（数组长度）
  it("{pass:false, defects:['缺入院护理评估记录','缺定期评估记录']} → defectCount=2", () => {
    const report = buildNursingAssessmentLinkReport({ pass: false, defects: ["缺入院护理评估记录", "缺定期评估记录"] });
    expect(report.defectCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-nursing-assessment-link auth:true", () => {
    const def = (emrQcNursingAssessmentLinkV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-nursing-assessment-link");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
