/**
 * 健澜科技 jlmedaios - 病历AI鉴别诊断支持 V14 单测（M550-B）
 *
 * 测试 buildAiDiagnosisDiff 构建 AI 鉴别诊断、diffDiagnosisByAi AI 鉴别诊断支持、buildAiDiagnosisDiffReport 构建鉴别诊断报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiDiagnosisDiff,
  buildAiDiagnosisDiffReport,
  diffDiagnosisByAi,
  type AiDiagnosisDiffInputV14,
} from "../../src/bff/aggregators/emrAiDiagnosisDiffV14Aggregator";
import { emrAiDiagnosisDiffV14Routes } from "../../src/bff/routes/emrAiDiagnosisDiffV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiDiagnosisDiff 构建 AI 鉴别诊断", () => {
  // 手算：recordId='RECB022', dept='心内科' → 正确构建
  it("recordId='RECB022', dept='心内科' → 正确构建", () => {
    const base = buildAiDiagnosisDiff("RECB022", "心内科");
    expect(base.recordId).toBe("RECB022");
    expect(base.dept).toBe("心内科");
  });
});

describe("diffDiagnosisByAi 老年胸痛", () => {
  // 手算：{symptom='胸痛伴大汗', age=65}
  // 手算：symptom.includes('胸痛')=true 且 age=65>60=true → candidates=['急性心梗','心绞痛','主动脉夹层']
  // 手算：candidates.length=3>1 → confidence=0.85
  it("{symptom='胸痛伴大汗', age=65} → candidates=['急性心梗','心绞痛','主动脉夹层'], confidence=0.85", () => {
    const input: AiDiagnosisDiffInputV14 = { symptom: "胸痛伴大汗", age: 65 };
    const result = diffDiagnosisByAi(input);
    expect(result.candidates).toEqual(["急性心梗", "心绞痛", "主动脉夹层"]);
    expect(result.confidence).toBe(0.85);
  });
});

describe("diffDiagnosisByAi 一般", () => {
  // 手算：{symptom='咳嗽', age=30}
  // 手算：symptom.includes('胸痛')=false → candidates=['待查']
  // 手算：candidates.length=1<=1 → confidence=0.5
  it("{symptom='咳嗽', age=30} → candidates=['待查'], confidence=0.5", () => {
    const input: AiDiagnosisDiffInputV14 = { symptom: "咳嗽", age: 30 };
    const result = diffDiagnosisByAi(input);
    expect(result.candidates).toEqual(["待查"]);
    expect(result.confidence).toBe(0.5);
  });
});

describe("buildAiDiagnosisDiffReport 构建鉴别诊断报告", () => {
  // 手算：{candidates=[3个], confidence=0.85}
  // 手算：透传 candidates + confidence
  it("{candidates=[3个], confidence=0.85} → 正确返回（透传）", () => {
    const report = buildAiDiagnosisDiffReport({ candidates: ["急性心梗", "心绞痛", "主动脉夹层"], confidence: 0.85 });
    expect(report.candidates).toEqual(["急性心梗", "心绞痛", "主动脉夹层"]);
    expect(report.confidence).toBe(0.85);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-diagnosis-diff auth:true", () => {
    const def = (emrAiDiagnosisDiffV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-diagnosis-diff");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
