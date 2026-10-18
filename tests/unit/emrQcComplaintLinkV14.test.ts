/**
 * 健澜科技 jlmedaios - 质控-患者投诉联动 V14 单测（M515-C）
 *
 * 测试 buildComplaintLink 构建联动数据、checkComplaintConsistency 检查投诉一致性、buildComplaintLinkReport 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildComplaintLink,
  buildComplaintLinkReport,
  checkComplaintConsistency,
  type ComplaintConsistencyRecordV14,
} from "../../src/bff/aggregators/emrQcComplaintLinkV14Aggregator";
import { emrQcComplaintLinkV14Routes } from "../../src/bff/routes/emrQcComplaintLinkV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildComplaintLink 构建联动数据", () => {
  // 手算：recordId='REC011', complaintType='服务态度', status='已处理' → 正确构建
  it("recordId='REC011', complaintType='服务态度', status='已处理' → 正确构建", () => {
    const link = buildComplaintLink("REC011", "服务态度", "已处理");
    expect(link.recordId).toBe("REC011");
    expect(link.complaintType).toBe("服务态度");
    expect(link.status).toBe("已处理");
  });
});

describe("checkComplaintConsistency 全部通过", () => {
  // 手算：三个字段都 true → pass=true, defects=[]
  it("{hasComplaintRecord:true, hasInvestigation:true, hasFeedback:true} → pass=true, defects=[]", () => {
    const record: ComplaintConsistencyRecordV14 = { hasComplaintRecord: true, hasInvestigation: true, hasFeedback: true };
    const result = checkComplaintConsistency(record);
    expect(result.pass).toBe(true);
    expect(result.defects.length).toBe(0);
  });
});

describe("checkComplaintConsistency 缺投诉调查记录", () => {
  // 手算：hasInvestigation=false → pass=false, defects 包含'缺投诉调查记录'
  it("{hasComplaintRecord:true, hasInvestigation:false, hasFeedback:true} → pass=false, defects 包含'缺投诉调查记录'", () => {
    const record: ComplaintConsistencyRecordV14 = { hasComplaintRecord: true, hasInvestigation: false, hasFeedback: true };
    const result = checkComplaintConsistency(record);
    expect(result.pass).toBe(false);
    expect(result.defects).toContain("缺投诉调查记录");
  });
});

describe("buildComplaintLinkReport 两条缺陷", () => {
  // 手算：{pass:false, defects:['缺投诉调查记录','缺患者反馈记录']} → defectCount=2（数组长度）
  it("{pass:false, defects:['缺投诉调查记录','缺患者反馈记录']} → defectCount=2", () => {
    const report = buildComplaintLinkReport({ pass: false, defects: ["缺投诉调查记录", "缺患者反馈记录"] });
    expect(report.defectCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-complaint-link auth:true", () => {
    const def = (emrQcComplaintLinkV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-complaint-link");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
