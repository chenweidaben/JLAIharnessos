/**
 * 健澜科技 jlmedaios - 质控-护理记录联动 V14 单测（M513-C）
 *
 * 测试 buildNursingLink 构建联动数据、checkNursingConsistency 检查护理一致性、buildNursingLinkReport 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildNursingLink,
  buildNursingLinkReport,
  checkNursingConsistency,
  type NursingConsistencyRecordV14,
} from "../../src/bff/aggregators/emrQcNursingLinkV14Aggregator";
import { emrQcNursingLinkV14Routes } from "../../src/bff/routes/emrQcNursingLinkV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildNursingLink 构建联动数据", () => {
  // 手算：recordId='REC003', nurse='王护士', noteCount=10 → 正确构建
  it("recordId='REC003', nurse='王护士', noteCount=10 → 正确构建", () => {
    const link = buildNursingLink("REC003", "王护士", 10);
    expect(link.recordId).toBe("REC003");
    expect(link.nurse).toBe("王护士");
    expect(link.noteCount).toBe(10);
  });
});

describe("checkNursingConsistency 全部通过", () => {
  // 手算：三个字段都 true → pass=true, defects=[]
  it("{hasCareRecord:true, hasVitalSigns:true, hasSignature:true} → pass=true, defects=[]", () => {
    const record: NursingConsistencyRecordV14 = { hasCareRecord: true, hasVitalSigns: true, hasSignature: true };
    const result = checkNursingConsistency(record);
    expect(result.pass).toBe(true);
    expect(result.defects.length).toBe(0);
  });
});

describe("checkNursingConsistency 缺生命体征记录", () => {
  // 手算：hasVitalSigns=false → pass=false, defects 包含'缺生命体征记录'
  it("{hasCareRecord:true, hasVitalSigns:false, hasSignature:true} → pass=false, defects 包含'缺生命体征记录'", () => {
    const record: NursingConsistencyRecordV14 = { hasCareRecord: true, hasVitalSigns: false, hasSignature: true };
    const result = checkNursingConsistency(record);
    expect(result.pass).toBe(false);
    expect(result.defects).toContain("缺生命体征记录");
  });
});

describe("buildNursingLinkReport 两条缺陷", () => {
  // 手算：{pass:false, defects:['缺生命体征记录','缺护理记录']} → defectCount=2（数组长度）
  it("{pass:false, defects:['缺生命体征记录','缺护理记录']} → defectCount=2", () => {
    const report = buildNursingLinkReport({ pass: false, defects: ["缺生命体征记录", "缺护理记录"] });
    expect(report.defectCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-nursing-link auth:true", () => {
    const def = (emrQcNursingLinkV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-nursing-link");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
