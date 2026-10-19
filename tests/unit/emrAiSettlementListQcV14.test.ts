/**
 * 健澜科技 jlmedaios - 病历AI医保结算清单质控 V14 单测（M552-D，M552 收官）
 *
 * 测试 buildAiSettlementListQc 构建 AI 医保结算清单质控、checkSettlementListQcByAi AI 医保结算清单质控、buildAiSettlementListQcReport 构建结算清单质控报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiSettlementListQc,
  buildAiSettlementListQcReport,
  checkSettlementListQcByAi,
  type AiSettlementListQcInputV14,
} from "../../src/bff/aggregators/emrAiSettlementListQcV14Aggregator";
import { emrAiSettlementListQcV14Routes } from "../../src/bff/routes/emrAiSettlementListQcV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiSettlementListQc 构建 AI 医保结算清单质控", () => {
  // 手算：recordId='RECB032', dept='医保办' → 正确构建
  it("recordId='RECB032', dept='医保办' → 正确构建", () => {
    const base = buildAiSettlementListQc("RECB032", "医保办");
    expect(base.recordId).toBe("RECB032");
    expect(base.dept).toBe("医保办");
  });
});

describe("checkSettlementListQcByAi 通过", () => {
  // 手算：{hasMainDiag=true, hasMainSurg=true, hasCostDetail=true, hasInsuranceType=true}
  // 手算：missingCount = 0+0+0+0 = 0
  // 手算：missingCount=0 → pass=true
  it("{hasMainDiag=true, hasMainSurg=true, hasCostDetail=true, hasInsuranceType=true} → missingCount=0, pass=true", () => {
    const input: AiSettlementListQcInputV14 = { hasMainDiag: true, hasMainSurg: true, hasCostDetail: true, hasInsuranceType: true };
    const result = checkSettlementListQcByAi(input);
    expect(result.missingCount).toBe(0);
    expect(result.pass).toBe(true);
  });
});

describe("checkSettlementListQcByAi 不通过", () => {
  // 手算：{hasMainDiag=true, hasMainSurg=false, hasCostDetail=true, hasInsuranceType=false}
  // 手算：missingCount = 0+1+0+1 = 2（缺手术+医保类型）
  // 手算：missingCount=2 → pass=false
  it("{hasMainDiag=true, hasMainSurg=false, hasCostDetail=true, hasInsuranceType=false} → missingCount=2, pass=false", () => {
    const input: AiSettlementListQcInputV14 = { hasMainDiag: true, hasMainSurg: false, hasCostDetail: true, hasInsuranceType: false };
    const result = checkSettlementListQcByAi(input);
    expect(result.missingCount).toBe(2);
    expect(result.pass).toBe(false);
  });
});

describe("buildAiSettlementListQcReport 构建结算清单质控报告", () => {
  // 手算：{missingCount=0, pass=true}
  // 手算：透传 missingCount + pass
  it("{missingCount=0, pass=true} → 正确返回（透传）", () => {
    const report = buildAiSettlementListQcReport({ missingCount: 0, pass: true });
    expect(report.missingCount).toBe(0);
    expect(report.pass).toBe(true);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-settlement-list-qc auth:true", () => {
    const def = (emrAiSettlementListQcV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-settlement-list-qc");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
