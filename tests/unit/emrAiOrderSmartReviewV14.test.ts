/**
 * 健澜科技 jlmedaios - 病历AI医嘱智能审核 V14 单测（M558-A）
 *
 * 测试 buildAiOrderSmartReview 构建 AI 医嘱智能审核、reviewOrderByAi AI 医嘱智能审核、buildAiOrderSmartReviewReport 构建医嘱智能审核报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiOrderSmartReview,
  buildAiOrderSmartReviewReport,
  reviewOrderByAi,
  type AiOrderSmartReviewInputV14,
} from "../../src/bff/aggregators/emrAiOrderSmartReviewV14Aggregator";
import { emrAiOrderSmartReviewV14Routes } from "../../src/bff/routes/emrAiOrderSmartReviewV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiOrderSmartReview 构建 AI 医嘱智能审核", () => {
  // 手算：recordId='RECB054', dept='内科' → 正确构建
  it("recordId='RECB054', dept='内科' → 正确构建", () => {
    const base = buildAiOrderSmartReview("RECB054", "内科");
    expect(base.recordId).toBe("RECB054");
    expect(base.dept).toBe("内科");
  });
});

describe("reviewOrderByAi 合理", () => {
  // 手算：{drugName='布洛芬', dosage='常规剂量', patientAge=45}
  // 手算：条件 = (45>=75) && '布洛芬'.includes('抗生素') && '常规剂量'.includes('大剂量')
  //   = false && ... && ... = false
  // 手算：isAppropriate = !(false) = true
  // 手算：advice = !true ? ... : '医嘱合理' = '医嘱合理'
  it("{drugName='布洛芬', dosage='常规剂量', patientAge=45} → isAppropriate=true, advice='医嘱合理'", () => {
    const input: AiOrderSmartReviewInputV14 = { drugName: "布洛芬", dosage: "常规剂量", patientAge: 45 };
    const result = reviewOrderByAi(input);
    expect(result.isAppropriate).toBe(true);
    expect(result.advice).toBe("医嘱合理");
  });
});

describe("reviewOrderByAi 不合理", () => {
  // 手算：{drugName='头孢类抗生素', dosage='大剂量', patientAge=80}
  // 手算：条件 = (80>=75) && '头孢类抗生素'.includes('抗生素') && '大剂量'.includes('大剂量')
  //   = true && true && true = true
  // 手算：isAppropriate = !(true) = false
  // 手算：advice = !false ? '建议调整剂量或更换药物' = '建议调整剂量或更换药物'
  it("{drugName='头孢类抗生素', dosage='大剂量', patientAge=80} → isAppropriate=false, advice='建议调整剂量或更换药物'", () => {
    const input: AiOrderSmartReviewInputV14 = { drugName: "头孢类抗生素", dosage: "大剂量", patientAge: 80 };
    const result = reviewOrderByAi(input);
    expect(result.isAppropriate).toBe(false);
    expect(result.advice).toBe("建议调整剂量或更换药物");
  });
});

describe("buildAiOrderSmartReviewReport 构建医嘱智能审核报告", () => {
  // 手算：{isAppropriate=true, advice='医嘱合理'}
  // 手算：透传 isAppropriate + advice
  it("{isAppropriate=true, advice='医嘱合理'} → 正确返回（透传）", () => {
    const report = buildAiOrderSmartReviewReport({ isAppropriate: true, advice: "医嘱合理" });
    expect(report.isAppropriate).toBe(true);
    expect(report.advice).toBe("医嘱合理");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-order-smart-review auth:true", () => {
    const def = (emrAiOrderSmartReviewV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-order-smart-review");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
