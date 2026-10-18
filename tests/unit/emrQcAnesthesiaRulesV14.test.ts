/**
 * 健澜科技 jlmedaios - 质控麻醉科专科规则 V14 单测（M512-A）
 *
 * 测试 buildAnesthesiaRules 规则列表、checkAnesthesia 检查、buildAnesthesiaReport 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAnesthesiaReport,
  buildAnesthesiaRules,
  checkAnesthesia,
  type AnesthesiaRecordV14,
} from "../../src/bff/aggregators/emrQcAnesthesiaRulesV14Aggregator";
import { emrQcAnesthesiaRulesV14Routes } from "../../src/bff/routes/emrQcAnesthesiaRulesV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAnesthesiaRules 规则列表", () => {
  // 手算：rules 包含 3 条以上麻醉科规则
  it("rules 包含 3 条以上麻醉科规则", () => {
    const rules = buildAnesthesiaRules();
    expect(rules.rules.length).toBeGreaterThanOrEqual(3);
  });
});

describe("checkAnesthesia 全部通过", () => {
  // 手算：三个字段都 true → pass=true, defects=[]
  it("{hasPreAnesthesiaEval:true, hasIntraAnesthesiaRecord:true, hasPostAnesthesiaNote:true} → pass=true, defects=[]", () => {
    const record: AnesthesiaRecordV14 = { hasPreAnesthesiaEval: true, hasIntraAnesthesiaRecord: true, hasPostAnesthesiaNote: true };
    const result = checkAnesthesia(record);
    expect(result.pass).toBe(true);
    expect(result.defects.length).toBe(0);
  });
});

describe("checkAnesthesia 缺术前评估", () => {
  // 手算：hasPreAnesthesiaEval=false → pass=false, defects 包含'缺术前评估'
  it("{hasPreAnesthesiaEval:false, hasIntraAnesthesiaRecord:true, hasPostAnesthesiaNote:true} → pass=false, defects 包含'缺术前评估'", () => {
    const record: AnesthesiaRecordV14 = { hasPreAnesthesiaEval: false, hasIntraAnesthesiaRecord: true, hasPostAnesthesiaNote: true };
    const result = checkAnesthesia(record);
    expect(result.pass).toBe(false);
    expect(result.defects).toContain("缺术前评估");
  });
});

describe("buildAnesthesiaReport 两条缺陷", () => {
  // 手算：{pass:false, defects:['缺术前评估','缺术中记录']} → defectCount=2（数组长度）
  it("{pass:false, defects:['缺术前评估','缺术中记录']} → defectCount=2", () => {
    const report = buildAnesthesiaReport({ pass: false, defects: ["缺术前评估", "缺术中记录"] });
    expect(report.defectCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-anesthesia-rules auth:true", () => {
    const def = (emrQcAnesthesiaRulesV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-anesthesia-rules");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
