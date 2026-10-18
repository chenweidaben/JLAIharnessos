/**
 * 健澜科技 jlmedaios - 质控急诊专科规则 V14 单测（M510-A）
 *
 * 测试 buildEmergencyRules 规则列表、checkEmergency 检查、buildEmergencyReport 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildEmergencyReport,
  buildEmergencyRules,
  checkEmergency,
  type EmergencyRecordV14,
} from "../../src/bff/aggregators/emrQcEmergencyRulesV14Aggregator";
import { emrQcEmergencyRulesV14Routes } from "../../src/bff/routes/emrQcEmergencyRulesV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildEmergencyRules 规则列表", () => {
  // 手算：rules 包含 3 条以上急诊规则
  it("rules 包含 3 条以上急诊规则", () => {
    const rules = buildEmergencyRules();
    expect(rules.rules.length).toBeGreaterThanOrEqual(3);
  });
});

describe("checkEmergency 全部通过", () => {
  // 手算：三个字段都 true → pass=true, defects=[]
  it("{hasTriage:true, hasRescueRecord:true, hasTimeStamp:true} → pass=true, defects=[]", () => {
    const record: EmergencyRecordV14 = { hasTriage: true, hasRescueRecord: true, hasTimeStamp: true };
    const result = checkEmergency(record);
    expect(result.pass).toBe(true);
    expect(result.defects.length).toBe(0);
  });
});

describe("checkEmergency 缺分诊记录", () => {
  // 手算：hasTriage=false → pass=false, defects 包含'缺分诊记录'
  it("{hasTriage:false, hasRescueRecord:true, hasTimeStamp:true} → pass=false, defects 包含'缺分诊记录'", () => {
    const record: EmergencyRecordV14 = { hasTriage: false, hasRescueRecord: true, hasTimeStamp: true };
    const result = checkEmergency(record);
    expect(result.pass).toBe(false);
    expect(result.defects).toContain("缺分诊记录");
  });
});

describe("buildEmergencyReport 两条缺陷", () => {
  // 手算：{pass:false, defects:['缺分诊记录','缺抢救记录']} → defectCount=2（数组长度）
  it("{pass:false, defects:['缺分诊记录','缺抢救记录']} → defectCount=2", () => {
    const report = buildEmergencyReport({ pass: false, defects: ["缺分诊记录", "缺抢救记录"] });
    expect(report.defectCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-emergency-rules auth:true", () => {
    const def = (emrQcEmergencyRulesV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-emergency-rules");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
