/**
 * 健澜科技 jlmedaios - 病历AI手术记录质控 V14 单测（M555-B）
 *
 * 测试 buildAiOpRecordQc 构建 AI 手术记录质控、checkOpRecordQcByAi AI 手术记录质控、buildAiOpRecordQcReport 构建手术记录质控报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiOpRecordQc,
  buildAiOpRecordQcReport,
  checkOpRecordQcByAi,
  type AiOpRecordQcInputV14,
} from "../../src/bff/aggregators/emrAiOpRecordQcV14Aggregator";
import { emrAiOpRecordQcV14Routes } from "../../src/bff/routes/emrAiOpRecordQcV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiOpRecordQc 构建 AI 手术记录质控", () => {
  // 手算：recordId='RECB042', dept='外科' → 正确构建
  it("recordId='RECB042', dept='外科' → 正确构建", () => {
    const base = buildAiOpRecordQc("RECB042", "外科");
    expect(base.recordId).toBe("RECB042");
    expect(base.dept).toBe("外科");
  });
});

describe("checkOpRecordQcByAi 通过", () => {
  // 手算：{hasOpName=true, hasOpDate=true, hasSurgeon=true, hasAnesthesia=true, hasOpFindings=true}
  // 手算：5 项全有 → missingCount=0
  // 手算：pass = 0 === 0 = true
  it("{hasOpName=true, hasOpDate=true, hasSurgeon=true, hasAnesthesia=true, hasOpFindings=true} → missingCount=0, pass=true", () => {
    const input: AiOpRecordQcInputV14 = {
      hasOpName: true,
      hasOpDate: true,
      hasSurgeon: true,
      hasAnesthesia: true,
      hasOpFindings: true,
    };
    const result = checkOpRecordQcByAi(input);
    expect(result.missingCount).toBe(0);
    expect(result.pass).toBe(true);
  });
});

describe("checkOpRecordQcByAi 不通过", () => {
  // 手算：{hasOpName=true, hasOpDate=true, hasSurgeon=true, hasAnesthesia=false, hasOpFindings=false}
  // 手算：missingCount = 0+0+0+1+1 = 2（缺麻醉+手术所见）
  // 手算：pass = 2 === 0 = false
  it("{hasOpName=true, hasOpDate=true, hasSurgeon=true, hasAnesthesia=false, hasOpFindings=false} → missingCount=2, pass=false", () => {
    const input: AiOpRecordQcInputV14 = {
      hasOpName: true,
      hasOpDate: true,
      hasSurgeon: true,
      hasAnesthesia: false,
      hasOpFindings: false,
    };
    const result = checkOpRecordQcByAi(input);
    expect(result.missingCount).toBe(2);
    expect(result.pass).toBe(false);
  });
});

describe("buildAiOpRecordQcReport 构建手术记录质控报告", () => {
  // 手算：{missingCount=0, pass=true}
  // 手算：透传 missingCount + pass
  it("{missingCount=0, pass=true} → 正确返回（透传）", () => {
    const report = buildAiOpRecordQcReport({ missingCount: 0, pass: true });
    expect(report.missingCount).toBe(0);
    expect(report.pass).toBe(true);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-op-record-qc auth:true", () => {
    const def = (emrAiOpRecordQcV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-op-record-qc");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
