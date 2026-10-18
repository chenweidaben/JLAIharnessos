/**
 * 健澜科技 jlmedaios - 质控妇产科专科规则 V14 单测（M509-D，M509 收官）
 *
 * 测试 buildObgynRules 规则列表、checkObgyn 检查、buildObgynReport 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildObgynReport,
  buildObgynRules,
  checkObgyn,
  type ObgynRecordV14,
} from "../../src/bff/aggregators/emrQcObgynRulesV14Aggregator";
import { emrQcObgynRulesV14Routes } from "../../src/bff/routes/emrQcObgynRulesV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildObgynRules 规则列表", () => {
  // 手算：rules 包含 3 条以上妇产科规则
  it("rules 包含 3 条以上妇产科规则", () => {
    const rules = buildObgynRules();
    expect(rules.rules.length).toBeGreaterThanOrEqual(3);
  });
});

describe("checkObgyn 全部通过", () => {
  // 手算：三个字段都 true → pass=true, defects=[]
  it("{hasPrenatalCheck:true, hasDeliveryNote:true, hasPostpartumNote:true} → pass=true, defects=[]", () => {
    const record: ObgynRecordV14 = { hasPrenatalCheck: true, hasDeliveryNote: true, hasPostpartumNote: true };
    const result = checkObgyn(record);
    expect(result.pass).toBe(true);
    expect(result.defects.length).toBe(0);
  });
});

describe("checkObgyn 缺产前检查记录", () => {
  // 手算：hasPrenatalCheck=false → pass=false, defects 包含'缺产前检查记录'
  it("{hasPrenatalCheck:false, hasDeliveryNote:true, hasPostpartumNote:true} → pass=false, defects 包含'缺产前检查记录'", () => {
    const record: ObgynRecordV14 = { hasPrenatalCheck: false, hasDeliveryNote: true, hasPostpartumNote: true };
    const result = checkObgyn(record);
    expect(result.pass).toBe(false);
    expect(result.defects).toContain("缺产前检查记录");
  });
});

describe("buildObgynReport 两条缺陷", () => {
  // 手算：{pass:false, defects:['缺产前检查记录','缺分娩记录']} → defectCount=2（数组长度）
  it("{pass:false, defects:['缺产前检查记录','缺分娩记录']} → defectCount=2", () => {
    const report = buildObgynReport({ pass: false, defects: ["缺产前检查记录", "缺分娩记录"] });
    expect(report.defectCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-obgyn-rules auth:true", () => {
    const def = (emrQcObgynRulesV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-obgyn-rules");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
