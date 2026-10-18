/**
 * 健澜科技 jlmedaios - 质控-临床路径联动 V14 单测（M514-C）
 *
 * 测试 buildClinicalPathwayLink 构建联动数据、checkPathwayConsistency 检查临床路径一致性、buildPathwayLinkReport 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildClinicalPathwayLink,
  buildPathwayLinkReport,
  checkPathwayConsistency,
  type PathwayConsistencyRecordV14,
} from "../../src/bff/aggregators/emrQcClinicalPathwayLinkV14Aggregator";
import { emrQcClinicalPathwayLinkV14Routes } from "../../src/bff/routes/emrQcClinicalPathwayLinkV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildClinicalPathwayLink 构建联动数据", () => {
  // 手算：recordId='REC007', pathwayName='急性阑尾炎路径', phase='观察期' → 正确构建
  it("recordId='REC007', pathwayName='急性阑尾炎路径', phase='观察期' → 正确构建", () => {
    const link = buildClinicalPathwayLink("REC007", "急性阑尾炎路径", "观察期");
    expect(link.recordId).toBe("REC007");
    expect(link.pathwayName).toBe("急性阑尾炎路径");
    expect(link.phase).toBe("观察期");
  });
});

describe("checkPathwayConsistency 全部通过", () => {
  // 手算：三个字段都 true → pass=true, defects=[]
  it("{hasPathwayEntry:true, hasPhaseUpdate:true, hasExitNote:true} → pass=true, defects=[]", () => {
    const record: PathwayConsistencyRecordV14 = { hasPathwayEntry: true, hasPhaseUpdate: true, hasExitNote: true };
    const result = checkPathwayConsistency(record);
    expect(result.pass).toBe(true);
    expect(result.defects.length).toBe(0);
  });
});

describe("checkPathwayConsistency 缺路径进入记录", () => {
  // 手算：hasPathwayEntry=false → pass=false, defects 包含'缺路径进入记录'
  it("{hasPathwayEntry:false, hasPhaseUpdate:true, hasExitNote:true} → pass=false, defects 包含'缺路径进入记录'", () => {
    const record: PathwayConsistencyRecordV14 = { hasPathwayEntry: false, hasPhaseUpdate: true, hasExitNote: true };
    const result = checkPathwayConsistency(record);
    expect(result.pass).toBe(false);
    expect(result.defects).toContain("缺路径进入记录");
  });
});

describe("buildPathwayLinkReport 两条缺陷", () => {
  // 手算：{pass:false, defects:['缺路径进入记录','缺阶段更新']} → defectCount=2（数组长度）
  it("{pass:false, defects:['缺路径进入记录','缺阶段更新']} → defectCount=2", () => {
    const report = buildPathwayLinkReport({ pass: false, defects: ["缺路径进入记录", "缺阶段更新"] });
    expect(report.defectCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-clinical-pathway-link auth:true", () => {
    const def = (emrQcClinicalPathwayLinkV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-clinical-pathway-link");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
