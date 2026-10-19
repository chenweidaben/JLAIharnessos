/**
 * 健澜科技 jlmedaios - 病历AI检验申请合理性审查 V14 单测（M561-B）
 *
 * 测试 buildAiLabApplyAudit 构建 AI 检验申请合理性审查、auditLabApplyByAi AI 检验申请合理性审查、buildAiLabApplyAuditReport 构建检验申请合理性审查报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiLabApplyAudit,
  buildAiLabApplyAuditReport,
  auditLabApplyByAi,
  type AiLabApplyAuditInputV14,
} from "../../src/bff/aggregators/emrAiLabApplyAuditV14Aggregator";
import { emrAiLabApplyAuditV14Routes } from "../../src/bff/routes/emrAiLabApplyAuditV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiLabApplyAudit 构建 AI 检验申请合理性审查", () => {
  // 手算：recordId='RECB067', dept='检验科' → 正确构建
  it("recordId='RECB067', dept='检验科' → 正确构建", () => {
    const base = buildAiLabApplyAudit("RECB067", "检验科");
    expect(base.recordId).toBe("RECB067");
    expect(base.dept).toBe("检验科");
  });
});

describe("auditLabApplyByAi 合理", () => {
  // 手算：{testName='血常规', patientAge=45, hasResult=true}
  // 手算：isRational = !(45>=75=false && ...) = !(false) = true
  // 手算：advice = '检验申请合理'
  it("{testName='血常规', patientAge=45, hasResult=true} → isRational=true, advice='检验申请合理'", () => {
    const input: AiLabApplyAuditInputV14 = { testName: "血常规", patientAge: 45, hasResult: true };
    const result = auditLabApplyByAi(input);
    expect(result.isRational).toBe(true);
    expect(result.advice).toBe("检验申请合理");
  });
});

describe("auditLabApplyByAi 不合理", () => {
  // 手算：{testName='肿瘤标志物全套', patientAge=80, hasResult=false}
  // 手算：isRational = !(80>=75=true && includes('肿瘤标志物')=true && !hasResult=true)
  //   = !(true) = false
  // 手算：advice = '老年患者肿瘤标志物筛查建议先常规检查'
  it("{testName='肿瘤标志物全套', patientAge=80, hasResult=false} → isRational=false, advice='老年患者肿瘤标志物筛查建议先常规检查'", () => {
    const input: AiLabApplyAuditInputV14 = { testName: "肿瘤标志物全套", patientAge: 80, hasResult: false };
    const result = auditLabApplyByAi(input);
    expect(result.isRational).toBe(false);
    expect(result.advice).toBe("老年患者肿瘤标志物筛查建议先常规检查");
  });
});

describe("buildAiLabApplyAuditReport 构建检验申请合理性审查报告", () => {
  // 手算：{isRational=true, advice='检验申请合理'}
  // 手算：透传 isRational + advice
  it("{isRational=true, advice='检验申请合理'} → 正确返回（透传）", () => {
    const report = buildAiLabApplyAuditReport({ isRational: true, advice: "检验申请合理" });
    expect(report.isRational).toBe(true);
    expect(report.advice).toBe("检验申请合理");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-lab-apply-audit auth:true", () => {
    const def = (emrAiLabApplyAuditV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-lab-apply-audit");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
