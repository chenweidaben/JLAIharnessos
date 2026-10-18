/**
 * 健澜科技 jlmedaios - 质控中医科专科规则 V14 单测（M510-C）
 *
 * 测试 buildTcmRules 规则列表、checkTcm 检查、buildTcmReport 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildTcmReport,
  buildTcmRules,
  checkTcm,
  type TcmRecordV14,
} from "../../src/bff/aggregators/emrQcTcmRulesV14Aggregator";
import { emrQcTcmRulesV14Routes } from "../../src/bff/routes/emrQcTcmRulesV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildTcmRules 规则列表", () => {
  // 手算：rules 包含 3 条以上中医科规则
  it("rules 包含 3 条以上中医科规则", () => {
    const rules = buildTcmRules();
    expect(rules.rules.length).toBeGreaterThanOrEqual(3);
  });
});

describe("checkTcm 全部通过", () => {
  // 手算：三个字段都 true → pass=true, defects=[]
  it("{hasSyndromeDifferentiation:true, hasPrescription:true, hasAcupunctureRecord:true} → pass=true, defects=[]", () => {
    const record: TcmRecordV14 = { hasSyndromeDifferentiation: true, hasPrescription: true, hasAcupunctureRecord: true };
    const result = checkTcm(record);
    expect(result.pass).toBe(true);
    expect(result.defects.length).toBe(0);
  });
});

describe("checkTcm 缺辨证记录", () => {
  // 手算：hasSyndromeDifferentiation=false → pass=false, defects 包含'缺辨证记录'
  it("{hasSyndromeDifferentiation:false, hasPrescription:true, hasAcupunctureRecord:true} → pass=false, defects 包含'缺辨证记录'", () => {
    const record: TcmRecordV14 = { hasSyndromeDifferentiation: false, hasPrescription: true, hasAcupunctureRecord: true };
    const result = checkTcm(record);
    expect(result.pass).toBe(false);
    expect(result.defects).toContain("缺辨证记录");
  });
});

describe("buildTcmReport 两条缺陷", () => {
  // 手算：{pass:false, defects:['缺辨证记录','缺处方记录']} → defectCount=2（数组长度）
  it("{pass:false, defects:['缺辨证记录','缺处方记录']} → defectCount=2", () => {
    const report = buildTcmReport({ pass: false, defects: ["缺辨证记录", "缺处方记录"] });
    expect(report.defectCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-tcm-rules auth:true", () => {
    const def = (emrQcTcmRulesV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-tcm-rules");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
