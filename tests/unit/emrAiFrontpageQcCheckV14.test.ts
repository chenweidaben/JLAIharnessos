/**
 * 健澜科技 jlmedaios - 病历AI首页质控检查 V14 单测（M551-A）
 *
 * 测试 buildAiFrontpageQcCheck 构建 AI 首页质控检查、checkFrontpageQcByAi AI 首页质控检查、buildAiFrontpageQcCheckReport 构建首页质控报告、读路由 GET auth:true。
 * 避让说明：M544-C 已有 emrAiFrontpageQcV14，本切片用 -check 后缀避让。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiFrontpageQcCheck,
  buildAiFrontpageQcCheckReport,
  checkFrontpageQcByAi,
  type AiFrontpageQcCheckInputV14,
} from "../../src/bff/aggregators/emrAiFrontpageQcCheckV14Aggregator";
import { emrAiFrontpageQcCheckV14Routes } from "../../src/bff/routes/emrAiFrontpageQcCheckV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiFrontpageQcCheck 构建 AI 首页质控检查", () => {
  // 手算：recordId='RECB025', dept='病案室' → 正确构建
  it("recordId='RECB025', dept='病案室' → 正确构建", () => {
    const base = buildAiFrontpageQcCheck("RECB025", "病案室");
    expect(base.recordId).toBe("RECB025");
    expect(base.dept).toBe("病案室");
  });
});

describe("checkFrontpageQcByAi 通过", () => {
  // 手算：{hasMainDx=true, hasMainOp=true, hasOutcome=true, hasCost=true}
  // 手算：missingCount = 0+0+0+0 = 0
  // 手算：missingCount=0 → pass=true
  it("{hasMainDx=true, hasMainOp=true, hasOutcome=true, hasCost=true} → missingCount=0, pass=true", () => {
    const input: AiFrontpageQcCheckInputV14 = { hasMainDx: true, hasMainOp: true, hasOutcome: true, hasCost: true };
    const result = checkFrontpageQcByAi(input);
    expect(result.missingCount).toBe(0);
    expect(result.pass).toBe(true);
  });
});

describe("checkFrontpageQcByAi 不通过", () => {
  // 手算：{hasMainDx=true, hasMainOp=false, hasOutcome=true, hasCost=false}
  // 手算：missingCount = 0+1+0+1 = 2（缺手术+费用）
  // 手算：missingCount=2 → pass=false
  it("{hasMainDx=true, hasMainOp=false, hasOutcome=true, hasCost=false} → missingCount=2, pass=false", () => {
    const input: AiFrontpageQcCheckInputV14 = { hasMainDx: true, hasMainOp: false, hasOutcome: true, hasCost: false };
    const result = checkFrontpageQcByAi(input);
    expect(result.missingCount).toBe(2);
    expect(result.pass).toBe(false);
  });
});

describe("buildAiFrontpageQcCheckReport 构建首页质控报告", () => {
  // 手算：{missingCount=0, pass=true}
  // 手算：透传 missingCount + pass
  it("{missingCount=0, pass=true} → 正确返回（透传）", () => {
    const report = buildAiFrontpageQcCheckReport({ missingCount: 0, pass: true });
    expect(report.missingCount).toBe(0);
    expect(report.pass).toBe(true);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-frontpage-qc-check auth:true", () => {
    const def = (emrAiFrontpageQcCheckV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-frontpage-qc-check");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
