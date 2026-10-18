/**
 * 健澜科技 jlmedaios - 质控-转科记录联动 V14 单测（M516-C）
 *
 * 测试 buildTransferLink 构建联动数据、checkTransferConsistency 检查转科一致性、buildTransferLinkReport 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildTransferLink,
  buildTransferLinkReport,
  checkTransferConsistency,
  type TransferConsistencyRecordV14,
} from "../../src/bff/aggregators/emrQcTransferLinkV14Aggregator";
import { emrQcTransferLinkV14Routes } from "../../src/bff/routes/emrQcTransferLinkV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildTransferLink 构建联动数据", () => {
  // 手算：recordId='REC015', fromDept='消化内科', toDept='普外科' → 正确构建
  it("recordId='REC015', fromDept='消化内科', toDept='普外科' → 正确构建", () => {
    const link = buildTransferLink("REC015", "消化内科", "普外科");
    expect(link.recordId).toBe("REC015");
    expect(link.fromDept).toBe("消化内科");
    expect(link.toDept).toBe("普外科");
  });
});

describe("checkTransferConsistency 全部通过", () => {
  // 手算：三个字段都 true → pass=true, defects=[]
  it("{hasTransferRecord:true, hasHandover:true, hasReceiveNote:true} → pass=true, defects=[]", () => {
    const record: TransferConsistencyRecordV14 = { hasTransferRecord: true, hasHandover: true, hasReceiveNote: true };
    const result = checkTransferConsistency(record);
    expect(result.pass).toBe(true);
    expect(result.defects.length).toBe(0);
  });
});

describe("checkTransferConsistency 缺转科记录", () => {
  // 手算：hasTransferRecord=false → pass=false, defects 包含'缺转科记录'
  it("{hasTransferRecord:false, hasHandover:true, hasReceiveNote:true} → pass=false, defects 包含'缺转科记录'", () => {
    const record: TransferConsistencyRecordV14 = { hasTransferRecord: false, hasHandover: true, hasReceiveNote: true };
    const result = checkTransferConsistency(record);
    expect(result.pass).toBe(false);
    expect(result.defects).toContain("缺转科记录");
  });
});

describe("buildTransferLinkReport 两条缺陷", () => {
  // 手算：{pass:false, defects:['缺转科记录','缺交接记录']} → defectCount=2（数组长度）
  it("{pass:false, defects:['缺转科记录','缺交接记录']} → defectCount=2", () => {
    const report = buildTransferLinkReport({ pass: false, defects: ["缺转科记录", "缺交接记录"] });
    expect(report.defectCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-transfer-link auth:true", () => {
    const def = (emrQcTransferLinkV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-transfer-link");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
