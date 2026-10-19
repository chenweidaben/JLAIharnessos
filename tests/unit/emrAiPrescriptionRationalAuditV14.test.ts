/**
 * 健澜科技 jlmedaios - 病历AI处方合理用药审查 V14 单测（M558-B）
 *
 * 测试 buildAiPrescriptionRationalAudit 构建 AI 处方合理用药审查、auditPrescriptionByAi AI 处方合理用药审查、buildAiPrescriptionRationalAuditReport 构建处方合理用药审查报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiPrescriptionRationalAudit,
  buildAiPrescriptionRationalAuditReport,
  auditPrescriptionByAi,
  type AiPrescriptionRationalAuditInputV14,
} from "../../src/bff/aggregators/emrAiPrescriptionRationalAuditV14Aggregator";
import { emrAiPrescriptionRationalAuditV14Routes } from "../../src/bff/routes/emrAiPrescriptionRationalAuditV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiPrescriptionRationalAudit 构建 AI 处方合理用药审查", () => {
  // 手算：recordId='RECB055', dept='药剂科' → 正确构建
  it("recordId='RECB055', dept='药剂科' → 正确构建", () => {
    const base = buildAiPrescriptionRationalAudit("RECB055", "药剂科");
    expect(base.recordId).toBe("RECB055");
    expect(base.dept).toBe("药剂科");
  });
});

describe("auditPrescriptionByAi 合理", () => {
  // 手算：{drugName='布洛芬', patientAge=45, hasAllergy=false}
  // 手算：isRational = !(false || (45>=75 && ...)) = !(false || false) = !(false) = true
  // 手算：advice = hasAllergy=false, 45>=75=false → '处方合理'
  it("{drugName='布洛芬', patientAge=45, hasAllergy=false} → isRational=true, advice='处方合理'", () => {
    const input: AiPrescriptionRationalAuditInputV14 = { drugName: "布洛芬", patientAge: 45, hasAllergy: false };
    const result = auditPrescriptionByAi(input);
    expect(result.isRational).toBe(true);
    expect(result.advice).toBe("处方合理");
  });
});

describe("auditPrescriptionByAi 过敏", () => {
  // 手算：{drugName='青霉素', patientAge=50, hasAllergy=true}
  // 手算：isRational = !(true || ...) = !(true) = false
  // 手算：advice = hasAllergy=true → '处方过敏风险，建议换药'
  it("{drugName='青霉素', patientAge=50, hasAllergy=true} → isRational=false, advice='处方过敏风险，建议换药'", () => {
    const input: AiPrescriptionRationalAuditInputV14 = { drugName: "青霉素", patientAge: 50, hasAllergy: true };
    const result = auditPrescriptionByAi(input);
    expect(result.isRational).toBe(false);
    expect(result.advice).toBe("处方过敏风险，建议换药");
  });
});

describe("buildAiPrescriptionRationalAuditReport 构建处方合理用药审查报告", () => {
  // 手算：{isRational=true, advice='处方合理'}
  // 手算：透传 isRational + advice
  it("{isRational=true, advice='处方合理'} → 正确返回（透传）", () => {
    const report = buildAiPrescriptionRationalAuditReport({ isRational: true, advice: "处方合理" });
    expect(report.isRational).toBe(true);
    expect(report.advice).toBe("处方合理");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-prescription-rational-audit auth:true", () => {
    const def = (emrAiPrescriptionRationalAuditV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-prescription-rational-audit");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
