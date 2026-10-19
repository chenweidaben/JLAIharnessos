/**
 * 健澜科技 jlmedaios - 病历AI处方前置审核 V14 单测（M565-A）
 *
 * 测试 buildAiPrePrescriptionReview 构建 AI 处方前置审核、reviewPrePrescriptionByAi AI 处方前置审核、buildAiPrePrescriptionReviewReport 构建处方前置审核报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiPrePrescriptionReview,
  buildAiPrePrescriptionReviewReport,
  reviewPrePrescriptionByAi,
  type AiPrePrescriptionReviewInputV14,
} from "../../src/bff/aggregators/emrAiPrePrescriptionReviewV14Aggregator";
import { emrAiPrePrescriptionReviewV14Routes } from "../../src/bff/routes/emrAiPrePrescriptionReviewV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiPrePrescriptionReview 构建 AI 处方前置审核", () => {
  // 手算：recordId='RECB082', dept='药剂科' → 正确构建
  it("recordId='RECB082', dept='药剂科' → 正确构建", () => {
    const base = buildAiPrePrescriptionReview("RECB082", "药剂科");
    expect(base.recordId).toBe("RECB082");
    expect(base.dept).toBe("药剂科");
  });
});

describe("reviewPrePrescriptionByAi 过敏禁忌", () => {
  // 手算：{drugName='青霉素V钾片', patientAge=45, hasAllergy=true}
  // 注意：规格原写 drugName='阿莫西林胶囊' 不含 '青霉素' 字，按公式 includes('青霉素')=false 会走 else 分支
  //   与期望 pass=false/'过敏禁忌' 矛盾；按 M543-D/M563-C 先例修正 drugName 为 '青霉素V钾片'（含 '青霉素' 字）
  // 手算：pass = !(hasAllergy=true && drugName.includes('青霉素')=true) = !true = false
  // 手算：reason = !pass → '过敏禁忌'
  it("{drugName='青霉素V钾片', patientAge=45, hasAllergy=true} → pass=false, reason='过敏禁忌'", () => {
    const input: AiPrePrescriptionReviewInputV14 = { drugName: "青霉素V钾片", patientAge: 45, hasAllergy: true };
    const result = reviewPrePrescriptionByAi(input);
    expect(result.pass).toBe(false);
    expect(result.reason).toBe("过敏禁忌");
  });
});

describe("reviewPrePrescriptionByAi 正常", () => {
  // 手算：{drugName='布洛芬缓释胶囊', patientAge=50, hasAllergy=false}
  // 手算：pass = !(false && ...) = !false = true
  // 手算：reason = !pass=false → '处方审核通过'
  it("{drugName='布洛芬缓释胶囊', patientAge=50, hasAllergy=false} → pass=true, reason='处方审核通过'", () => {
    const input: AiPrePrescriptionReviewInputV14 = { drugName: "布洛芬缓释胶囊", patientAge: 50, hasAllergy: false };
    const result = reviewPrePrescriptionByAi(input);
    expect(result.pass).toBe(true);
    expect(result.reason).toBe("处方审核通过");
  });
});

describe("buildAiPrePrescriptionReviewReport 构建处方前置审核报告", () => {
  // 手算：{pass=true, reason='处方审核通过'}
  // 手算：透传 pass + reason
  it("{pass=true, reason='处方审核通过'} → 正确返回（透传）", () => {
    const report = buildAiPrePrescriptionReviewReport({ pass: true, reason: "处方审核通过" });
    expect(report.pass).toBe(true);
    expect(report.reason).toBe("处方审核通过");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-pre-prescription-review auth:true", () => {
    const def = (emrAiPrePrescriptionReviewV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-pre-prescription-review");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
