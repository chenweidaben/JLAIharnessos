/**
 * 健澜科技 jlmedaios - 病历AI用药建议 V14 单测（M545-C）
 *
 * 测试 buildAiMedReco 构建 AI 用药建议、recommendMedByAi AI 用药建议、buildAiMedRecoReport 构建用药报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiMedReco,
  buildAiMedRecoReport,
  recommendMedByAi,
  type AiMedRecoInputV14,
} from "../../src/bff/aggregators/emrAiMedRecoV14Aggregator";
import { emrAiMedRecoV14Routes } from "../../src/bff/routes/emrAiMedRecoV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiMedReco 构建 AI 用药建议", () => {
  // 手算：recordId='RECB003', dept='心内科' → 正确构建
  it("recordId='RECB003', dept='心内科' → 正确构建", () => {
    const base = buildAiMedReco("RECB003", "心内科");
    expect(base.recordId).toBe("RECB003");
    expect(base.dept).toBe("心内科");
  });
});

describe("recommendMedByAi 心梗老年", () => {
  // 手算：{diagnosis='急性心梗', age=75}
  // 手算：diagnosis.includes('心梗') → true → meds=['阿司匹林','他汀']
  // 手算：age=75 > 70 → caution='注意老年患者剂量调整'
  it("{diagnosis='急性心梗', age=75} → meds=['阿司匹林','他汀'], caution='注意老年患者剂量调整'", () => {
    const input: AiMedRecoInputV14 = { diagnosis: "急性心梗", age: 75 };
    const result = recommendMedByAi(input);
    expect(result.meds).toEqual(["阿司匹林", "他汀"]);
    expect(result.caution).toBe("注意老年患者剂量调整");
  });
});

describe("recommendMedByAi 一般", () => {
  // 手算：{diagnosis='上感', age=40}
  // 手算：diagnosis.includes('心梗') → false → meds=['对症治疗']
  // 手算：age=40 <= 70 → caution='常规剂量'
  it("{diagnosis='上感', age=40} → meds=['对症治疗'], caution='常规剂量'", () => {
    const input: AiMedRecoInputV14 = { diagnosis: "上感", age: 40 };
    const result = recommendMedByAi(input);
    expect(result.meds).toEqual(["对症治疗"]);
    expect(result.caution).toBe("常规剂量");
  });
});

describe("buildAiMedRecoReport 构建用药报告", () => {
  // 手算：{meds=['阿司匹林','他汀'], caution='注意老年患者剂量调整'}
  // 手算：透传 meds + caution
  it("{meds=['阿司匹林','他汀'], caution='注意老年患者剂量调整'} → 正确返回（透传）", () => {
    const report = buildAiMedRecoReport({ meds: ["阿司匹林", "他汀"], caution: "注意老年患者剂量调整" });
    expect(report.meds).toEqual(["阿司匹林", "他汀"]);
    expect(report.caution).toBe("注意老年患者剂量调整");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-med-reco auth:true", () => {
    const def = (emrAiMedRecoV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-med-reco");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
