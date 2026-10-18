/**
 * 健澜科技 jlmedaios - 质控-病案首页联动 V14 单测（M516-A）
 *
 * 测试 buildHomepageLink 构建联动数据、checkHomepageConsistency 检查病案首页一致性、buildHomepageLinkReport 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildHomepageLink,
  buildHomepageLinkReport,
  checkHomepageConsistency,
  type HomepageConsistencyRecordV14,
} from "../../src/bff/aggregators/emrQcHomepageLinkV14Aggregator";
import { emrQcHomepageLinkV14Routes } from "../../src/bff/routes/emrQcHomepageLinkV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildHomepageLink 构建联动数据", () => {
  // 手算：recordId='REC013', diagnosisCount=3, surgeryCount=1 → 正确构建
  it("recordId='REC013', diagnosisCount=3, surgeryCount=1 → 正确构建", () => {
    const link = buildHomepageLink("REC013", 3, 1);
    expect(link.recordId).toBe("REC013");
    expect(link.diagnosisCount).toBe(3);
    expect(link.surgeryCount).toBe(1);
  });
});

describe("checkHomepageConsistency 全部通过", () => {
  // 手算：三个字段都 true → pass=true, defects=[]
  it("{hasDiagnosis:true, hasSurgery:true, hasDischargeInfo:true} → pass=true, defects=[]", () => {
    const record: HomepageConsistencyRecordV14 = { hasDiagnosis: true, hasSurgery: true, hasDischargeInfo: true };
    const result = checkHomepageConsistency(record);
    expect(result.pass).toBe(true);
    expect(result.defects.length).toBe(0);
  });
});

describe("checkHomepageConsistency 缺首页诊断信息", () => {
  // 手算：hasDiagnosis=false → pass=false, defects 包含'缺首页诊断信息'
  it("{hasDiagnosis:false, hasSurgery:true, hasDischargeInfo:true} → pass=false, defects 包含'缺首页诊断信息'", () => {
    const record: HomepageConsistencyRecordV14 = { hasDiagnosis: false, hasSurgery: true, hasDischargeInfo: true };
    const result = checkHomepageConsistency(record);
    expect(result.pass).toBe(false);
    expect(result.defects).toContain("缺首页诊断信息");
  });
});

describe("buildHomepageLinkReport 两条缺陷", () => {
  // 手算：{pass:false, defects:['缺首页诊断信息','缺首页手术信息']} → defectCount=2（数组长度）
  it("{pass:false, defects:['缺首页诊断信息','缺首页手术信息']} → defectCount=2", () => {
    const report = buildHomepageLinkReport({ pass: false, defects: ["缺首页诊断信息", "缺首页手术信息"] });
    expect(report.defectCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-homepage-link auth:true", () => {
    const def = (emrQcHomepageLinkV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-homepage-link");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
