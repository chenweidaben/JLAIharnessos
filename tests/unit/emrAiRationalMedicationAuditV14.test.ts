/**
 * 健澜科技 jlmedaios - 病历AI合理用药审查 V14 单测（M554-B）
 *
 * 测试 buildAiRationalMedicationAudit 构建 AI 合理用药审查、auditRationalMedicationByAi AI 合理用药审查、buildAiRationalMedicationAuditReport 构建合理用药审查报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiRationalMedicationAudit,
  buildAiRationalMedicationAuditReport,
  auditRationalMedicationByAi,
  type AiRationalMedicationAuditInputV14,
} from "../../src/bff/aggregators/emrAiRationalMedicationAuditV14Aggregator";
import { emrAiRationalMedicationAuditV14Routes } from "../../src/bff/routes/emrAiRationalMedicationAuditV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiRationalMedicationAudit 构建 AI 合理用药审查", () => {
  // 手算：recordId='RECB038', dept='药剂科' → 正确构建
  it("recordId='RECB038', dept='药剂科' → 正确构建", () => {
    const base = buildAiRationalMedicationAudit("RECB038", "药剂科");
    expect(base.recordId).toBe("RECB038");
    expect(base.dept).toBe("药剂科");
  });
});

describe("auditRationalMedicationByAi 合理", () => {
  // 手算：{drugName='布洛芬', patientAge=45, hasAllergy=false}
  // 手算：isRational = !(false || (45>=75 && '布洛芬'.includes('抗生素'))) = !(false) = true
  // 手算：advice = hasAllergy=false, 45<75 → '用药合理'
  it("{drugName='布洛芬', patientAge=45, hasAllergy=false} → isRational=true, advice='用药合理'", () => {
    const input: AiRationalMedicationAuditInputV14 = { drugName: "布洛芬", patientAge: 45, hasAllergy: false };
    const result = auditRationalMedicationByAi(input);
    expect(result.isRational).toBe(true);
    expect(result.advice).toBe("用药合理");
  });
});

describe("auditRationalMedicationByAi 过敏", () => {
  // 手算：{drugName='青霉素', patientAge=50, hasAllergy=true}
  // 手算：isRational = !(true || ...) = !true = false
  // 手算：advice = hasAllergy=true → '建议更换药物'
  it("{drugName='青霉素', patientAge=50, hasAllergy=true} → isRational=false, advice='建议更换药物'", () => {
    const input: AiRationalMedicationAuditInputV14 = { drugName: "青霉素", patientAge: 50, hasAllergy: true };
    const result = auditRationalMedicationByAi(input);
    expect(result.isRational).toBe(false);
    expect(result.advice).toBe("建议更换药物");
  });
});

describe("buildAiRationalMedicationAuditReport 构建合理用药审查报告", () => {
  // 手算：{isRational=true, advice='用药合理'}
  // 手算：透传 isRational + advice
  it("{isRational=true, advice='用药合理'} → 正确返回（透传）", () => {
    const report = buildAiRationalMedicationAuditReport({ isRational: true, advice: "用药合理" });
    expect(report.isRational).toBe(true);
    expect(report.advice).toBe("用药合理");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-rational-medication-audit auth:true", () => {
    const def = (emrAiRationalMedicationAuditV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-rational-medication-audit");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
