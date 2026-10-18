/**
 * 健澜科技 jlmedaios - 病历AI鉴别诊断 V14 单测（M545-B）
 *
 * 测试 buildAiDiffDx 构建 AI 鉴别诊断、suggestDiffDx AI 鉴别诊断建议、buildAiDiffDxReport 构建鉴别诊断报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiDiffDx,
  buildAiDiffDxReport,
  suggestDiffDx,
  type AiDiffDxInputV14,
} from "../../src/bff/aggregators/emrAiDiffDxV14Aggregator";
import { emrAiDiffDxV14Routes } from "../../src/bff/routes/emrAiDiffDxV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiDiffDx 构建 AI 鉴别诊断", () => {
  // 手算：recordId='RECB002', dept='心内科' → 正确构建
  it("recordId='RECB002', dept='心内科' → 正确构建", () => {
    const base = buildAiDiffDx("RECB002", "心内科");
    expect(base.recordId).toBe("RECB002");
    expect(base.dept).toBe("心内科");
  });
});

describe("suggestDiffDx 胸痛", () => {
  // 手算：{symptom='胸痛伴大汗'}
  // 手算：symptom.includes('胸痛') → true → candidates=['心绞痛','急性心梗','主动脉夹层']
  // 手算：count = candidates.length = 3
  it("{symptom='胸痛伴大汗'} → candidates=['心绞痛','急性心梗','主动脉夹层'], count=3", () => {
    const input: AiDiffDxInputV14 = { symptom: "胸痛伴大汗" };
    const result = suggestDiffDx(input);
    expect(result.candidates).toEqual(["心绞痛", "急性心梗", "主动脉夹层"]);
    expect(result.count).toBe(3);
  });
});

describe("suggestDiffDx 一般", () => {
  // 手算：{symptom='咳嗽咳痰'}
  // 手算：symptom.includes('胸痛') → false → candidates=['待查']
  // 手算：count = candidates.length = 1
  it("{symptom='咳嗽咳痰'} → candidates=['待查'], count=1", () => {
    const input: AiDiffDxInputV14 = { symptom: "咳嗽咳痰" };
    const result = suggestDiffDx(input);
    expect(result.candidates).toEqual(["待查"]);
    expect(result.count).toBe(1);
  });
});

describe("buildAiDiffDxReport 构建鉴别诊断报告", () => {
  // 手算：{candidates=['心绞痛','急性心梗','主动脉夹层'], count=3}
  // 手算：透传 candidates + count
  it("{candidates=['心绞痛','急性心梗','主动脉夹层'], count=3} → 正确返回（透传）", () => {
    const report = buildAiDiffDxReport({ candidates: ["心绞痛", "急性心梗", "主动脉夹层"], count: 3 });
    expect(report.candidates).toEqual(["心绞痛", "急性心梗", "主动脉夹层"]);
    expect(report.count).toBe(3);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-diff-dx auth:true", () => {
    const def = (emrAiDiffDxV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-diff-dx");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
