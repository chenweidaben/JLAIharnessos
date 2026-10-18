/**
 * 健澜科技 jlmedaios - 手术记录模板规范 V14 单测（M523-C）
 *
 * 测试 buildSurgerySpec 构建规范、validateSurgeryTemplate 校验手术模板、buildSurgerySpecReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildSurgerySpec,
  buildSurgerySpecReport,
  validateSurgeryTemplate,
  type SurgeryValidateInputV14,
} from "../../src/bff/aggregators/emrTemplateSurgerySpecV14Aggregator";
import { emrTemplateSurgerySpecV14Routes } from "../../src/bff/routes/emrTemplateSurgerySpecV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildSurgerySpec 构建规范", () => {
  // 手算：surgeryType='腹腔镜胆囊切除术', specVersion='v2.0' → 正确构建
  it("surgeryType='腹腔镜胆囊切除术', specVersion='v2.0' → 正确构建", () => {
    const spec = buildSurgerySpec("腹腔镜胆囊切除术", "v2.0");
    expect(spec.surgeryType).toBe("腹腔镜胆囊切除术");
    expect(spec.specVersion).toBe("v2.0");
  });
});

describe("validateSurgeryTemplate 全部通过", () => {
  // 手算：{hasPreOp:true, hasIncision:true, hasAnesthesia:true, hasPostOp:true}
  // 手算：4 字段都 true → valid=true, missingFields=[]
  it("{hasPreOp:true, hasIncision:true, hasAnesthesia:true, hasPostOp:true} → valid=true, missingFields=[]", () => {
    const input: SurgeryValidateInputV14 = { hasPreOp: true, hasIncision: true, hasAnesthesia: true, hasPostOp: true };
    const result = validateSurgeryTemplate(input);
    expect(result.valid).toBe(true);
    expect(result.missingFields).toEqual([]);
  });
});

describe("validateSurgeryTemplate 缺项", () => {
  // 手算：{hasPreOp:true, hasIncision:false, hasAnesthesia:true, hasPostOp:false}
  // 手算：hasIncision=false → '缺切口记录'; hasPostOp=false → '缺术后记录'
  // 手算：valid=false, missingFields=['缺切口记录','缺术后记录']
  it("{hasPreOp:true, hasIncision:false, hasAnesthesia:true, hasPostOp:false} → valid=false, missingFields 包含'缺切口记录'和'缺术后记录'", () => {
    const input: SurgeryValidateInputV14 = { hasPreOp: true, hasIncision: false, hasAnesthesia: true, hasPostOp: false };
    const result = validateSurgeryTemplate(input);
    expect(result.valid).toBe(false);
    expect(result.missingFields).toContain("缺切口记录");
    expect(result.missingFields).toContain("缺术后记录");
    expect(result.missingFields.length).toBe(2);
  });
});

describe("buildSurgerySpecReport 构建报告", () => {
  // 手算：{valid:false, missingFields:['缺切口记录','缺术后记录']}
  // 手算：missingCount = missingFields.length = 2
  it("{valid:false, missingFields:['缺切口记录','缺术后记录']} → missingCount=2", () => {
    const report = buildSurgerySpecReport({ valid: false, missingFields: ["缺切口记录", "缺术后记录"] });
    expect(report.valid).toBe(false);
    expect(report.missingCount).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-template-surgery-spec auth:true", () => {
    const def = (emrTemplateSurgerySpecV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-template-surgery-spec");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
