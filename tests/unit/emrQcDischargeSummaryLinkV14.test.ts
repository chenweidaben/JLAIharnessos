/**
 * 健澜科技 jlmedaios - 质控-出院小结联动 V14 单测（M516-B）
 *
 * 测试 buildDischargeSummaryLink 构建联动数据、checkDischargeSummaryConsistency 检查出院小结一致性、buildDischargeSummaryLinkReport 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDischargeSummaryLink,
  buildDischargeSummaryLinkReport,
  checkDischargeSummaryConsistency,
  type DischargeSummaryConsistencyRecordV14,
} from "../../src/bff/aggregators/emrQcDischargeSummaryLinkV14Aggregator";
import { emrQcDischargeSummaryLinkV14Routes } from "../../src/bff/routes/emrQcDischargeSummaryLinkV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildDischargeSummaryLink 构建联动数据", () => {
  // 手算：recordId='REC014', dischargeDate='2026-10-15', followUpDate='2026-10-29' → 正确构建
  it("recordId='REC014', dischargeDate='2026-10-15', followUpDate='2026-10-29' → 正确构建", () => {
    const link = buildDischargeSummaryLink("REC014", "2026-10-15", "2026-10-29");
    expect(link.recordId).toBe("REC014");
    expect(link.dischargeDate).toBe("2026-10-15");
    expect(link.followUpDate).toBe("2026-10-29");
  });
});

describe("checkDischargeSummaryConsistency 全部通过", () => {
  // 手算：三个字段都 true → pass=true, defects=[]
  it("{hasDiagnosis:true, hasTreatment:true, hasFollowUp:true} → pass=true, defects=[]", () => {
    const record: DischargeSummaryConsistencyRecordV14 = { hasDiagnosis: true, hasTreatment: true, hasFollowUp: true };
    const result = checkDischargeSummaryConsistency(record);
    expect(result.pass).toBe(true);
    expect(result.defects.length).toBe(0);
  });
});

describe("checkDischargeSummaryConsistency 缺治疗方案记录", () => {
  // 手算：hasTreatment=false → pass=false, defects 包含'缺治疗方案记录'
  it("{hasDiagnosis:true, hasTreatment:false, hasFollowUp:true} → pass=false, defects 包含'缺治疗方案记录'", () => {
    const record: DischargeSummaryConsistencyRecordV14 = { hasDiagnosis: true, hasTreatment: false, hasFollowUp: true };
    const result = checkDischargeSummaryConsistency(record);
    expect(result.pass).toBe(false);
    expect(result.defects).toContain("缺治疗方案记录");
  });
});

describe("buildDischargeSummaryLinkReport 两条缺陷", () => {
  // 手算：{pass:false, defects:['缺治疗方案记录','缺随访计划']} → defectCount=2（数组长度）
  it("{pass:false, defects:['缺治疗方案记录','缺随访计划']} → defectCount=2", () => {
    const report = buildDischargeSummaryLinkReport({ pass: false, defects: ["缺治疗方案记录", "缺随访计划"] });
    expect(report.defectCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-discharge-summary-link auth:true", () => {
    const def = (emrQcDischargeSummaryLinkV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-discharge-summary-link");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
