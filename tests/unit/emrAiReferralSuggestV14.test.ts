/**
 * 健澜科技 jlmedaios - 病历AI转诊建议 V14 单测（M547-C）
 *
 * 测试 buildAiReferralSuggest 构建 AI 转诊建议、suggestReferralByAi AI 转诊建议、buildAiReferralSuggestReport 构建转诊报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiReferralSuggest,
  buildAiReferralSuggestReport,
  suggestReferralByAi,
  type AiReferralSuggestInputV14,
} from "../../src/bff/aggregators/emrAiReferralSuggestV14Aggregator";
import { emrAiReferralSuggestV14Routes } from "../../src/bff/routes/emrAiReferralSuggestV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiReferralSuggest 构建 AI 转诊建议", () => {
  // 手算：recordId='RECB011', dept='急诊科' → 正确构建
  it("recordId='RECB011', dept='急诊科' → 正确构建", () => {
    const base = buildAiReferralSuggest("RECB011", "急诊科");
    expect(base.recordId).toBe("RECB011");
    expect(base.dept).toBe("急诊科");
  });
});

describe("suggestReferralByAi 需转诊", () => {
  // 手算：{diagnosis='急性心梗', severity=9}
  // 手算：diagnosis.includes('心梗') → true；severity=9 → 9>=8 → needReferral=true
  // 手算：needReferral=true → targetDept='心内科ICU'
  it("{diagnosis='急性心梗', severity=9} → needReferral=true, targetDept='心内科ICU'", () => {
    const input: AiReferralSuggestInputV14 = { diagnosis: "急性心梗", severity: 9 };
    const result = suggestReferralByAi(input);
    expect(result.needReferral).toBe(true);
    expect(result.targetDept).toBe("心内科ICU");
  });
});

describe("suggestReferralByAi 不需转诊", () => {
  // 手算：{diagnosis='上感', severity=3}
  // 手算：diagnosis.includes('心梗') → false → needReferral=false
  // 手算：needReferral=false → targetDept='普通病房'
  it("{diagnosis='上感', severity=3} → needReferral=false, targetDept='普通病房'", () => {
    const input: AiReferralSuggestInputV14 = { diagnosis: "上感", severity: 3 };
    const result = suggestReferralByAi(input);
    expect(result.needReferral).toBe(false);
    expect(result.targetDept).toBe("普通病房");
  });
});

describe("buildAiReferralSuggestReport 构建转诊报告", () => {
  // 手算：{needReferral=true, targetDept='心内科ICU'}
  // 手算：透传 needReferral + targetDept
  it("{needReferral=true, targetDept='心内科ICU'} → 正确返回（透传）", () => {
    const report = buildAiReferralSuggestReport({ needReferral: true, targetDept: "心内科ICU" });
    expect(report.needReferral).toBe(true);
    expect(report.targetDept).toBe("心内科ICU");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-referral-suggest auth:true", () => {
    const def = (emrAiReferralSuggestV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-referral-suggest");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
