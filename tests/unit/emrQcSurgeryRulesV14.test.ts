/**
 * 健澜科技 jlmedaios - 质控外科专科规则 V14 单测（M509-B）
 *
 * 测试 buildSurgeryRules 规则列表、checkSurgery 检查、buildSurgeryReport 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildSurgeryReport,
  buildSurgeryRules,
  checkSurgery,
  type SurgeryRecordV14,
} from "../../src/bff/aggregators/emrQcSurgeryRulesV14Aggregator";
import { emrQcSurgeryRulesV14Routes } from "../../src/bff/routes/emrQcSurgeryRulesV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildSurgeryRules 规则列表", () => {
  // 手算：rules 包含 3 条以上外科规则
  it("rules 包含 3 条以上外科规则", () => {
    const rules = buildSurgeryRules();
    expect(rules.rules.length).toBeGreaterThanOrEqual(3);
  });
});

describe("checkSurgery 全部通过", () => {
  // 手算：三个字段都 true → pass=true, defects=[]
  it("{hasOperativeNote:true, hasAnesthesiaRecord:true, hasPostOpRecord:true} → pass=true, defects=[]", () => {
    const record: SurgeryRecordV14 = { hasOperativeNote: true, hasAnesthesiaRecord: true, hasPostOpRecord: true };
    const result = checkSurgery(record);
    expect(result.pass).toBe(true);
    expect(result.defects.length).toBe(0);
  });
});

describe("checkSurgery 缺手术记录", () => {
  // 手算：hasOperativeNote=false → pass=false, defects 包含'缺手术记录'
  it("{hasOperativeNote:false, hasAnesthesiaRecord:true, hasPostOpRecord:true} → pass=false, defects 包含'缺手术记录'", () => {
    const record: SurgeryRecordV14 = { hasOperativeNote: false, hasAnesthesiaRecord: true, hasPostOpRecord: true };
    const result = checkSurgery(record);
    expect(result.pass).toBe(false);
    expect(result.defects).toContain("缺手术记录");
  });
});

describe("buildSurgeryReport 两条缺陷", () => {
  // 手算：{pass:false, defects:['缺手术记录','缺麻醉记录']} → defectCount=2（数组长度）
  it("{pass:false, defects:['缺手术记录','缺麻醉记录']} → defectCount=2", () => {
    const report = buildSurgeryReport({ pass: false, defects: ["缺手术记录", "缺麻醉记录"] });
    expect(report.defectCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-surgery-rules auth:true", () => {
    const def = (emrQcSurgeryRulesV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-surgery-rules");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
