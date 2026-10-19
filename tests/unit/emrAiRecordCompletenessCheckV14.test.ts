/**
 * 健澜科技 jlmedaios - 病历AI病历完整性检查 V14 单测（M553-B）
 *
 * 测试 buildAiRecordCompletenessCheck 构建 AI 病历完整性检查、checkRecordCompletenessByAi AI 病历完整性检查、buildAiRecordCompletenessCheckReport 构建完整性检查报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiRecordCompletenessCheck,
  buildAiRecordCompletenessCheckReport,
  checkRecordCompletenessByAi,
  type AiRecordCompletenessCheckInputV14,
} from "../../src/bff/aggregators/emrAiRecordCompletenessCheckV14Aggregator";
import { emrAiRecordCompletenessCheckV14Routes } from "../../src/bff/routes/emrAiRecordCompletenessCheckV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiRecordCompletenessCheck 构建 AI 病历完整性检查", () => {
  // 手算：recordId='RECB034', dept='内科' → 正确构建
  it("recordId='RECB034', dept='内科' → 正确构建", () => {
    const base = buildAiRecordCompletenessCheck("RECB034", "内科");
    expect(base.recordId).toBe("RECB034");
    expect(base.dept).toBe("内科");
  });
});

describe("checkRecordCompletenessByAi 完整", () => {
  // 手算：{hasChiefComplaint=true, hasPresentIllness=true, hasPastHistory=true, hasPhysicalExam=true}
  // 手算：missingItems = 0+0+0+0 = 0
  // 手算：completenessRate = Math.round((4-0)/4*1000)/10 = Math.round(1000)/10 = 100.0
  it("{hasChiefComplaint=true, hasPresentIllness=true, hasPastHistory=true, hasPhysicalExam=true} → missingItems=0, completenessRate=100.0", () => {
    const input: AiRecordCompletenessCheckInputV14 = { hasChiefComplaint: true, hasPresentIllness: true, hasPastHistory: true, hasPhysicalExam: true };
    const result = checkRecordCompletenessByAi(input);
    expect(result.missingItems).toBe(0);
    expect(result.completenessRate).toBe(100.0);
  });
});

describe("checkRecordCompletenessByAi 部分缺失", () => {
  // 手算：{hasChiefComplaint=true, hasPresentIllness=true, hasPastHistory=false, hasPhysicalExam=false}
  // 手算：missingItems = 0+0+1+1 = 2（缺既往史+体格检查）
  // 手算：completenessRate = Math.round((4-2)/4*1000)/10 = Math.round(500)/10 = 50.0
  it("{hasChiefComplaint=true, hasPresentIllness=true, hasPastHistory=false, hasPhysicalExam=false} → missingItems=2, completenessRate=50.0", () => {
    const input: AiRecordCompletenessCheckInputV14 = { hasChiefComplaint: true, hasPresentIllness: true, hasPastHistory: false, hasPhysicalExam: false };
    const result = checkRecordCompletenessByAi(input);
    expect(result.missingItems).toBe(2);
    expect(result.completenessRate).toBe(50.0);
  });
});

describe("buildAiRecordCompletenessCheckReport 构建完整性检查报告", () => {
  // 手算：{missingItems=0, completenessRate=100.0}
  // 手算：透传 missingItems + completenessRate
  it("{missingItems=0, completenessRate=100.0} → 正确返回（透传）", () => {
    const report = buildAiRecordCompletenessCheckReport({ missingItems: 0, completenessRate: 100.0 });
    expect(report.missingItems).toBe(0);
    expect(report.completenessRate).toBe(100.0);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-record-completeness-check auth:true", () => {
    const def = (emrAiRecordCompletenessCheckV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-record-completeness-check");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
