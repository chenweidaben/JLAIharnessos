/**
 * 健澜科技 jlmedaios - 质控-会诊记录联动 V14 单测（M516-D，M516 收官）
 *
 * 测试 buildConsultLink 构建联动数据、checkConsultConsistency 检查会诊一致性、buildConsultLinkReport 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildConsultLink,
  buildConsultLinkReport,
  checkConsultConsistency,
  type ConsultConsistencyRecordV14,
} from "../../src/bff/aggregators/emrQcConsultLinkV14Aggregator";
import { emrQcConsultLinkV14Routes } from "../../src/bff/routes/emrQcConsultLinkV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildConsultLink 构建联动数据", () => {
  // 手算：recordId='REC016', consultDept='心内科', consultType='院内会诊' → 正确构建
  it("recordId='REC016', consultDept='心内科', consultType='院内会诊' → 正确构建", () => {
    const link = buildConsultLink("REC016", "心内科", "院内会诊");
    expect(link.recordId).toBe("REC016");
    expect(link.consultDept).toBe("心内科");
    expect(link.consultType).toBe("院内会诊");
  });
});

describe("checkConsultConsistency 全部通过", () => {
  // 手算：三个字段都 true → pass=true, defects=[]
  it("{hasRequest:true, hasOpinion:true, hasReply:true} → pass=true, defects=[]", () => {
    const record: ConsultConsistencyRecordV14 = { hasRequest: true, hasOpinion: true, hasReply: true };
    const result = checkConsultConsistency(record);
    expect(result.pass).toBe(true);
    expect(result.defects.length).toBe(0);
  });
});

describe("checkConsultConsistency 缺会诊意见记录", () => {
  // 手算：hasOpinion=false → pass=false, defects 包含'缺会诊意见记录'
  it("{hasRequest:true, hasOpinion:false, hasReply:true} → pass=false, defects 包含'缺会诊意见记录'", () => {
    const record: ConsultConsistencyRecordV14 = { hasRequest: true, hasOpinion: false, hasReply: true };
    const result = checkConsultConsistency(record);
    expect(result.pass).toBe(false);
    expect(result.defects).toContain("缺会诊意见记录");
  });
});

describe("buildConsultLinkReport 两条缺陷", () => {
  // 手算：{pass:false, defects:['缺会诊意见记录','缺会诊回复']} → defectCount=2（数组长度）
  it("{pass:false, defects:['缺会诊意见记录','缺会诊回复']} → defectCount=2", () => {
    const report = buildConsultLinkReport({ pass: false, defects: ["缺会诊意见记录", "缺会诊回复"] });
    expect(report.defectCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-consult-link auth:true", () => {
    const def = (emrQcConsultLinkV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-consult-link");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
