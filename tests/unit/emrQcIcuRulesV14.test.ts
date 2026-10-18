/**
 * 健澜科技 jlmedaios - 质控重症医学科(ICU)专科规则 V14 单测（M510-B）
 *
 * 测试 buildIcuRules 规则列表、checkIcu 检查、buildIcuReport 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildIcuReport,
  buildIcuRules,
  checkIcu,
  type IcuRecordV14,
} from "../../src/bff/aggregators/emrQcIcuRulesV14Aggregator";
import { emrQcIcuRulesV14Routes } from "../../src/bff/routes/emrQcIcuRulesV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildIcuRules 规则列表", () => {
  // 手算：rules 包含 3 条以上 ICU 规则
  it("rules 包含 3 条以上 ICU 规则", () => {
    const rules = buildIcuRules();
    expect(rules.rules.length).toBeGreaterThanOrEqual(3);
  });
});

describe("checkIcu 全部通过", () => {
  // 手算：三个字段都 true → pass=true, defects=[]
  it("{hasDailyNote:true, hasVitalSigns:true, hasCarePlan:true} → pass=true, defects=[]", () => {
    const record: IcuRecordV14 = { hasDailyNote: true, hasVitalSigns: true, hasCarePlan: true };
    const result = checkIcu(record);
    expect(result.pass).toBe(true);
    expect(result.defects.length).toBe(0);
  });
});

describe("checkIcu 缺病程记录", () => {
  // 手算：hasDailyNote=false → pass=false, defects 包含'缺病程记录'
  it("{hasDailyNote:false, hasVitalSigns:true, hasCarePlan:true} → pass=false, defects 包含'缺病程记录'", () => {
    const record: IcuRecordV14 = { hasDailyNote: false, hasVitalSigns: true, hasCarePlan: true };
    const result = checkIcu(record);
    expect(result.pass).toBe(false);
    expect(result.defects).toContain("缺病程记录");
  });
});

describe("buildIcuReport 两条缺陷", () => {
  // 手算：{pass:false, defects:['缺病程记录','缺生命体征记录']} → defectCount=2（数组长度）
  it("{pass:false, defects:['缺病程记录','缺生命体征记录']} → defectCount=2", () => {
    const report = buildIcuReport({ pass: false, defects: ["缺病程记录", "缺生命体征记录"] });
    expect(report.defectCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-icu-rules auth:true", () => {
    const def = (emrQcIcuRulesV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-icu-rules");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
