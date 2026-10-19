/**
 * 健澜科技 jlmedaios - 病历AI费用合理性审查 V14 单测（M552-C）
 *
 * 测试 buildAiCostRationalAudit 构建 AI 费用合理性审查、auditCostRationalByAi AI 费用合理性审查、buildAiCostRationalAuditReport 构建费用审查报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiCostRationalAudit,
  buildAiCostRationalAuditReport,
  auditCostRationalByAi,
  type AiCostRationalAuditInputV14,
} from "../../src/bff/aggregators/emrAiCostRationalAuditV14Aggregator";
import { emrAiCostRationalAuditV14Routes } from "../../src/bff/routes/emrAiCostRationalAuditV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiCostRationalAudit 构建 AI 费用合理性审查", () => {
  // 手算：recordId='RECB031', dept='医保办' → 正确构建
  it("recordId='RECB031', dept='医保办' → 正确构建", () => {
    const base = buildAiCostRationalAudit("RECB031", "医保办");
    expect(base.recordId).toBe("RECB031");
    expect(base.dept).toBe("医保办");
  });
});

describe("auditCostRationalByAi 合理", () => {
  // 手算：{actualCost=10500, expectedCost=10000}
  // 手算：deviationPct = Math.round((10500-10000)/10000*1000)/10 = Math.round(50)/10 = 5.0
  // 手算：isReasonable = |5.0| <= 20 → true
  it("{actualCost=10500, expectedCost=10000} → deviationPct=5.0, isReasonable=true", () => {
    const input: AiCostRationalAuditInputV14 = { actualCost: 10500, expectedCost: 10000 };
    const result = auditCostRationalByAi(input);
    expect(result.deviationPct).toBe(5.0);
    expect(result.isReasonable).toBe(true);
  });
});

describe("auditCostRationalByAi 不合理", () => {
  // 手算：{actualCost=15000, expectedCost=10000}
  // 手算：deviationPct = Math.round((15000-10000)/10000*1000)/10 = Math.round(500)/10 = 50.0
  // 手算：isReasonable = |50.0| > 20 → false
  it("{actualCost=15000, expectedCost=10000} → deviationPct=50.0, isReasonable=false", () => {
    const input: AiCostRationalAuditInputV14 = { actualCost: 15000, expectedCost: 10000 };
    const result = auditCostRationalByAi(input);
    expect(result.deviationPct).toBe(50.0);
    expect(result.isReasonable).toBe(false);
  });
});

describe("buildAiCostRationalAuditReport 构建费用审查报告", () => {
  // 手算：{isReasonable=true, deviationPct=5.0}
  // 手算：透传 isReasonable + deviationPct
  it("{isReasonable=true, deviationPct=5.0} → 正确返回（透传）", () => {
    const report = buildAiCostRationalAuditReport({ isReasonable: true, deviationPct: 5.0 });
    expect(report.isReasonable).toBe(true);
    expect(report.deviationPct).toBe(5.0);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-cost-rational-audit auth:true", () => {
    const def = (emrAiCostRationalAuditV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-cost-rational-audit");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
