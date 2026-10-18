/**
 * 健澜科技 jlmedaios - 质控-抗菌药物管理联动 V14 单测（M514-D，M514 收官）
 *
 * 测试 buildAntibioticLink 构建联动数据、checkAntibioticConsistency 检查抗菌药物一致性、buildAntibioticLinkReport 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAntibioticLink,
  buildAntibioticLinkReport,
  checkAntibioticConsistency,
  type AntibioticConsistencyRecordV14,
} from "../../src/bff/aggregators/emrQcAntibioticLinkV14Aggregator";
import { emrQcAntibioticLinkV14Routes } from "../../src/bff/routes/emrQcAntibioticLinkV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAntibioticLink 构建联动数据", () => {
  // 手算：recordId='REC008', antibioticName='头孢呋辛', days=7 → 正确构建
  it("recordId='REC008', antibioticName='头孢呋辛', days=7 → 正确构建", () => {
    const link = buildAntibioticLink("REC008", "头孢呋辛", 7);
    expect(link.recordId).toBe("REC008");
    expect(link.antibioticName).toBe("头孢呋辛");
    expect(link.days).toBe(7);
  });
});

describe("checkAntibioticConsistency 全部通过", () => {
  // 手算：三个字段都 true → pass=true, defects=[]
  it("{hasIndication:true, hasCulture:true, hasDeEscalation:true} → pass=true, defects=[]", () => {
    const record: AntibioticConsistencyRecordV14 = { hasIndication: true, hasCulture: true, hasDeEscalation: true };
    const result = checkAntibioticConsistency(record);
    expect(result.pass).toBe(true);
    expect(result.defects.length).toBe(0);
  });
});

describe("checkAntibioticConsistency 缺用药指征", () => {
  // 手算：hasIndication=false → pass=false, defects 包含'缺用药指征'
  it("{hasIndication:false, hasCulture:true, hasDeEscalation:true} → pass=false, defects 包含'缺用药指征'", () => {
    const record: AntibioticConsistencyRecordV14 = { hasIndication: false, hasCulture: true, hasDeEscalation: true };
    const result = checkAntibioticConsistency(record);
    expect(result.pass).toBe(false);
    expect(result.defects).toContain("缺用药指征");
  });
});

describe("buildAntibioticLinkReport 两条缺陷", () => {
  // 手算：{pass:false, defects:['缺用药指征','缺病原学检查']} → defectCount=2（数组长度）
  it("{pass:false, defects:['缺用药指征','缺病原学检查']} → defectCount=2", () => {
    const report = buildAntibioticLinkReport({ pass: false, defects: ["缺用药指征", "缺病原学检查"] });
    expect(report.defectCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-antibiotic-link auth:true", () => {
    const def = (emrQcAntibioticLinkV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-antibiotic-link");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
