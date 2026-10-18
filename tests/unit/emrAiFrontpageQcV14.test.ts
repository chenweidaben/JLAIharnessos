/**
 * 健澜科技 jlmedaios - 病历AI病案首页质控 V14 单测（M544-C）
 *
 * 测试 buildAiFrontpageQc 构建 AI 首页质控、qcFrontpageByAi AI 首页质控、buildAiFrontpageQcReport 构建首页质控报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiFrontpageQc,
  buildAiFrontpageQcReport,
  qcFrontpageByAi,
  type AiFrontpageQcInputV14,
} from "../../src/bff/aggregators/emrAiFrontpageQcV14Aggregator";
import { emrAiFrontpageQcV14Routes } from "../../src/bff/routes/emrAiFrontpageQcV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiFrontpageQc 构建 AI 首页质控", () => {
  // 手算：recordId='RECA003', dept='心内科' → 正确构建
  it("recordId='RECA003', dept='心内科' → 正确构建", () => {
    const base = buildAiFrontpageQc("RECA003", "心内科");
    expect(base.recordId).toBe("RECA003");
    expect(base.dept).toBe("心内科");
  });
});

describe("qcFrontpageByAi 通过", () => {
  // 手算：{hasMainDx=true, hasMainOp=true, hasOutcome=true}
  // 手算：issues = 0+0+0 = 0
  // 手算：pass = issues === 0 → true
  it("{hasMainDx=true, hasMainOp=true, hasOutcome=true} → issues=0, pass=true", () => {
    const input: AiFrontpageQcInputV14 = { hasMainDx: true, hasMainOp: true, hasOutcome: true };
    const result = qcFrontpageByAi(input);
    expect(result.issues).toBe(0);
    expect(result.pass).toBe(true);
  });
});

describe("qcFrontpageByAi 不通过", () => {
  // 手算：{hasMainDx=true, hasMainOp=false, hasOutcome=false}
  // 手算：issues = 0+1+1 = 2（缺手术+转归）
  // 手算：pass = issues === 0 → false
  it("{hasMainDx=true, hasMainOp=false, hasOutcome=false} → issues=2, pass=false", () => {
    const input: AiFrontpageQcInputV14 = { hasMainDx: true, hasMainOp: false, hasOutcome: false };
    const result = qcFrontpageByAi(input);
    expect(result.issues).toBe(2);
    expect(result.pass).toBe(false);
  });
});

describe("buildAiFrontpageQcReport 构建首页质控报告", () => {
  // 手算：{issues=0, pass=true}
  // 手算：透传 issues + pass
  it("{issues=0, pass=true} → 正确返回（透传）", () => {
    const report = buildAiFrontpageQcReport({ issues: 0, pass: true });
    expect(report.issues).toBe(0);
    expect(report.pass).toBe(true);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-frontpage-qc auth:true", () => {
    const def = (emrAiFrontpageQcV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-frontpage-qc");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
