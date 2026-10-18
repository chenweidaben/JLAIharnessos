/**
 * 健澜科技 jlmedaios - 质控-手术麻醉联动 V14 单测（M513-D，M513 收官）
 *
 * 测试 buildSurgeryLink 构建联动数据、checkSurgeryConsistency 检查手术麻醉一致性、buildSurgeryLinkReport 报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildSurgeryLink,
  buildSurgeryLinkReport,
  checkSurgeryConsistency,
  type SurgeryConsistencyRecordV14,
} from "../../src/bff/aggregators/emrQcSurgeryLinkV14Aggregator";
import { emrQcSurgeryLinkV14Routes } from "../../src/bff/routes/emrQcSurgeryLinkV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildSurgeryLink 构建联动数据", () => {
  // 手算：recordId='REC004', surgeon='李主任', anesthesiaType='全麻' → 正确构建
  it("recordId='REC004', surgeon='李主任', anesthesiaType='全麻' → 正确构建", () => {
    const link = buildSurgeryLink("REC004", "李主任", "全麻");
    expect(link.recordId).toBe("REC004");
    expect(link.surgeon).toBe("李主任");
    expect(link.anesthesiaType).toBe("全麻");
  });
});

describe("checkSurgeryConsistency 全部通过", () => {
  // 手算：三个字段都 true → pass=true, defects=[]
  it("{hasOperativeNote:true, hasAnesthesiaRecord:true, hasPostOpNote:true} → pass=true, defects=[]", () => {
    const record: SurgeryConsistencyRecordV14 = { hasOperativeNote: true, hasAnesthesiaRecord: true, hasPostOpNote: true };
    const result = checkSurgeryConsistency(record);
    expect(result.pass).toBe(true);
    expect(result.defects.length).toBe(0);
  });
});

describe("checkSurgeryConsistency 缺麻醉记录", () => {
  // 手算：hasAnesthesiaRecord=false → pass=false, defects 包含'缺麻醉记录'
  it("{hasOperativeNote:true, hasAnesthesiaRecord:false, hasPostOpNote:true} → pass=false, defects 包含'缺麻醉记录'", () => {
    const record: SurgeryConsistencyRecordV14 = { hasOperativeNote: true, hasAnesthesiaRecord: false, hasPostOpNote: true };
    const result = checkSurgeryConsistency(record);
    expect(result.pass).toBe(false);
    expect(result.defects).toContain("缺麻醉记录");
  });
});

describe("buildSurgeryLinkReport 两条缺陷", () => {
  // 手算：{pass:false, defects:['缺麻醉记录','缺手术记录']} → defectCount=2（数组长度）
  it("{pass:false, defects:['缺麻醉记录','缺手术记录']} → defectCount=2", () => {
    const report = buildSurgeryLinkReport({ pass: false, defects: ["缺麻醉记录", "缺手术记录"] });
    expect(report.defectCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-surgery-link auth:true", () => {
    const def = (emrQcSurgeryLinkV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-surgery-link");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
