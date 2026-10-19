/**
 * 健澜科技 jlmedaios - 病历AI病历逻辑一致性检查 V14 单测（M553-C）
 *
 * 测试 buildAiRecordConsistencyCheck 构建 AI 病历逻辑一致性检查、checkRecordConsistencyByAi AI 病历逻辑一致性检查、buildAiRecordConsistencyCheckReport 构建一致性检查报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiRecordConsistencyCheck,
  buildAiRecordConsistencyCheckReport,
  checkRecordConsistencyByAi,
  type AiRecordConsistencyCheckInputV14,
} from "../../src/bff/aggregators/emrAiRecordConsistencyCheckV14Aggregator";
import { emrAiRecordConsistencyCheckV14Routes } from "../../src/bff/routes/emrAiRecordConsistencyCheckV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiRecordConsistencyCheck 构建 AI 病历逻辑一致性检查", () => {
  // 手算：recordId='RECB035', dept='内科' → 正确构建
  it("recordId='RECB035', dept='内科' → 正确构建", () => {
    const base = buildAiRecordConsistencyCheck("RECB035", "内科");
    expect(base.recordId).toBe("RECB035");
    expect(base.dept).toBe("内科");
  });
});

describe("checkRecordConsistencyByAi 一致", () => {
  // 手算：{admissionDiagnosis='急性心梗', dischargeDiagnosis='急性心梗'}
  // 手算：admissionDiagnosis === dischargeDiagnosis → isConsistent=true
  // 手算：isConsistent=true → issueCount=0
  it("{admissionDiagnosis='急性心梗', dischargeDiagnosis='急性心梗'} → isConsistent=true, issueCount=0", () => {
    const input: AiRecordConsistencyCheckInputV14 = { admissionDiagnosis: "急性心梗", dischargeDiagnosis: "急性心梗" };
    const result = checkRecordConsistencyByAi(input);
    expect(result.isConsistent).toBe(true);
    expect(result.issueCount).toBe(0);
  });
});

describe("checkRecordConsistencyByAi 不一致", () => {
  // 手算：{admissionDiagnosis='肺炎', dischargeDiagnosis='急性心梗'}
  // 手算：('肺炎' === '急性心梗') || ('急性心梗'.includes('肺炎')) || ('肺炎'.includes('急性心梗')) → false
  // 手算：isConsistent=false → issueCount=1
  it("{admissionDiagnosis='肺炎', dischargeDiagnosis='急性心梗'} → isConsistent=false, issueCount=1", () => {
    const input: AiRecordConsistencyCheckInputV14 = { admissionDiagnosis: "肺炎", dischargeDiagnosis: "急性心梗" };
    const result = checkRecordConsistencyByAi(input);
    expect(result.isConsistent).toBe(false);
    expect(result.issueCount).toBe(1);
  });
});

describe("buildAiRecordConsistencyCheckReport 构建一致性检查报告", () => {
  // 手算：{isConsistent=true, issueCount=0}
  // 手算：透传 isConsistent + issueCount
  it("{isConsistent=true, issueCount=0} → 正确返回（透传）", () => {
    const report = buildAiRecordConsistencyCheckReport({ isConsistent: true, issueCount: 0 });
    expect(report.isConsistent).toBe(true);
    expect(report.issueCount).toBe(0);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-record-consistency-check auth:true", () => {
    const def = (emrAiRecordConsistencyCheckV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-record-consistency-check");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
