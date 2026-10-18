/**
 * 健澜科技 jlmedaios - 质控-手术分级授权联动 V14 单测（M515-D，M515 收官）
 *
 * 测试 buildSurgeryAuthLink 构建联动数据、checkSurgeryAuthConsistency 检查手术授权一致性、buildSurgeryAuthLinkReport 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildSurgeryAuthLink,
  buildSurgeryAuthLinkReport,
  checkSurgeryAuthConsistency,
  type SurgeryAuthConsistencyRecordV14,
} from "../../src/bff/aggregators/emrQcSurgeryAuthLinkV14Aggregator";
import { emrQcSurgeryAuthLinkV14Routes } from "../../src/bff/routes/emrQcSurgeryAuthLinkV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildSurgeryAuthLink 构建联动数据", () => {
  // 手算：recordId='REC012', surgeonLevel='主任医师', surgeryLevel='三级手术' → 正确构建
  it("recordId='REC012', surgeonLevel='主任医师', surgeryLevel='三级手术' → 正确构建", () => {
    const link = buildSurgeryAuthLink("REC012", "主任医师", "三级手术");
    expect(link.recordId).toBe("REC012");
    expect(link.surgeonLevel).toBe("主任医师");
    expect(link.surgeryLevel).toBe("三级手术");
  });
});

describe("checkSurgeryAuthConsistency 全部通过", () => {
  // 手算：三个字段都 true → pass=true, defects=[]
  it("{hasAuth:true, hasLevelMatch:true, hasRecord:true} → pass=true, defects=[]", () => {
    const record: SurgeryAuthConsistencyRecordV14 = { hasAuth: true, hasLevelMatch: true, hasRecord: true };
    const result = checkSurgeryAuthConsistency(record);
    expect(result.pass).toBe(true);
    expect(result.defects.length).toBe(0);
  });
});

describe("checkSurgeryAuthConsistency 缺手术授权记录", () => {
  // 手算：hasAuth=false → pass=false, defects 包含'缺手术授权记录'
  it("{hasAuth:false, hasLevelMatch:true, hasRecord:true} → pass=false, defects 包含'缺手术授权记录'", () => {
    const record: SurgeryAuthConsistencyRecordV14 = { hasAuth: false, hasLevelMatch: true, hasRecord: true };
    const result = checkSurgeryAuthConsistency(record);
    expect(result.pass).toBe(false);
    expect(result.defects).toContain("缺手术授权记录");
  });
});

describe("buildSurgeryAuthLinkReport 两条缺陷", () => {
  // 手算：{pass:false, defects:['缺手术授权记录','级别不匹配']} → defectCount=2（数组长度）
  it("{pass:false, defects:['缺手术授权记录','级别不匹配']} → defectCount=2", () => {
    const report = buildSurgeryAuthLinkReport({ pass: false, defects: ["缺手术授权记录", "级别不匹配"] });
    expect(report.defectCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-surgery-auth-link auth:true", () => {
    const def = (emrQcSurgeryAuthLinkV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-surgery-auth-link");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
