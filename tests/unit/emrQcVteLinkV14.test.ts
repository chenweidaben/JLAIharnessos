/**
 * 健澜科技 jlmedaios - 质控-VTE预防联动 V14 单测（M515-B）
 *
 * 测试 buildVteLink 构建联动数据、checkVteConsistency 检查VTE一致性、buildVteLinkReport 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildVteLink,
  buildVteLinkReport,
  checkVteConsistency,
  type VteConsistencyRecordV14,
} from "../../src/bff/aggregators/emrQcVteLinkV14Aggregator";
import { emrQcVteLinkV14Routes } from "../../src/bff/routes/emrQcVteLinkV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildVteLink 构建联动数据", () => {
  // 手算：recordId='REC010', riskLevel='高危', preventionMeasures=['气压治疗','抗凝药物'] → 正确构建
  it("recordId='REC010', riskLevel='高危', preventionMeasures=['气压治疗','抗凝药物'] → 正确构建", () => {
    const link = buildVteLink("REC010", "高危", ["气压治疗", "抗凝药物"]);
    expect(link.recordId).toBe("REC010");
    expect(link.riskLevel).toBe("高危");
    expect(link.preventionMeasures).toEqual(["气压治疗", "抗凝药物"]);
  });
});

describe("checkVteConsistency 全部通过", () => {
  // 手算：三个字段都 true → pass=true, defects=[]
  it("{hasAssessment:true, hasPrevention:true, hasEducation:true} → pass=true, defects=[]", () => {
    const record: VteConsistencyRecordV14 = { hasAssessment: true, hasPrevention: true, hasEducation: true };
    const result = checkVteConsistency(record);
    expect(result.pass).toBe(true);
    expect(result.defects.length).toBe(0);
  });
});

describe("checkVteConsistency 缺VTE风险评估记录", () => {
  // 手算：hasAssessment=false → pass=false, defects 包含'缺VTE风险评估记录'
  it("{hasAssessment:false, hasPrevention:true, hasEducation:true} → pass=false, defects 包含'缺VTE风险评估记录'", () => {
    const record: VteConsistencyRecordV14 = { hasAssessment: false, hasPrevention: true, hasEducation: true };
    const result = checkVteConsistency(record);
    expect(result.pass).toBe(false);
    expect(result.defects).toContain("缺VTE风险评估记录");
  });
});

describe("buildVteLinkReport 两条缺陷", () => {
  // 手算：{pass:false, defects:['缺VTE风险评估记录','缺预防措施记录']} → defectCount=2（数组长度）
  it("{pass:false, defects:['缺VTE风险评估记录','缺预防措施记录']} → defectCount=2", () => {
    const report = buildVteLinkReport({ pass: false, defects: ["缺VTE风险评估记录", "缺预防措施记录"] });
    expect(report.defectCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-vte-link auth:true", () => {
    const def = (emrQcVteLinkV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-vte-link");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
