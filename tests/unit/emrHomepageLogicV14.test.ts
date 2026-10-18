/**
 * 健澜科技 jlmedaios - 病案首页逻辑校验 V14 单测（M535-B）
 *
 * 测试 buildHomepageLogic 构建首页逻辑校验、checkHomepageLogic 首页逻辑校验、buildHomepageLogicReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildHomepageLogic,
  buildHomepageLogicReport,
  checkHomepageLogic,
  type HomepageLogicInputV14,
} from "../../src/bff/aggregators/emrHomepageLogicV14Aggregator";
import { emrHomepageLogicV14Routes } from "../../src/bff/routes/emrHomepageLogicV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildHomepageLogic 构建首页逻辑校验", () => {
  // 手算：recordId='REC201', dept='普外科' → 正确构建
  it("recordId='REC201', dept='普外科' → 正确构建", () => {
    const logic = buildHomepageLogic("REC201", "普外科");
    expect(logic.recordId).toBe("REC201");
    expect(logic.dept).toBe("普外科");
  });
});

describe("checkHomepageLogic 正常", () => {
  // 手算：{admissionDays=7, age=45, hasSurgery=true}
  // 手算：条件1 admissionDays<0? 7<0=false → 不触发
  // 手算：条件2 age<0? 45<0=false → 不触发
  // 手算：条件3 hasSurgery && admissionDays===0? true && 7===0=false → 不触发
  // 手算：errors=[], valid=true
  it("{admissionDays=7, age=45, hasSurgery=true} → valid=true, errors=[]", () => {
    const input: HomepageLogicInputV14 = { admissionDays: 7, age: 45, hasSurgery: true };
    const result = checkHomepageLogic(input);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

describe("checkHomepageLogic 手术+0天", () => {
  // 手算：{admissionDays=0, age=45, hasSurgery=true}
  // 手算：条件1 admissionDays<0? 0<0=false → 不触发
  // 手算：条件2 age<0? 45<0=false → 不触发
  // 手算：条件3 hasSurgery && admissionDays===0? true && 0===0=true → 触发'手术患者住院天数不能为0'
  // 手算：errors=['手术患者住院天数不能为0'], valid=false
  it("{admissionDays=0, age=45, hasSurgery=true} → valid=false, errors=['手术患者住院天数不能为0']", () => {
    const input: HomepageLogicInputV14 = { admissionDays: 0, age: 45, hasSurgery: true };
    const result = checkHomepageLogic(input);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(["手术患者住院天数不能为0"]);
  });
});

describe("buildHomepageLogicReport 构建报告", () => {
  // 手算：{valid:false, errors=['手术患者住院天数不能为0']}
  // 手算：透传 valid + errors
  it("{valid:false, errors=['手术患者住院天数不能为0']} → 正确返回（透传）", () => {
    const report = buildHomepageLogicReport({ valid: false, errors: ["手术患者住院天数不能为0"] });
    expect(report.valid).toBe(false);
    expect(report.errors).toEqual(["手术患者住院天数不能为0"]);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-homepage-logic auth:true", () => {
    const def = (emrHomepageLogicV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-homepage-logic");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
