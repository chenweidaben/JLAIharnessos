/**
 * 健澜科技 jlmedaios - 病历AI检查申请智能推荐 V14 单测（M561-A）
 *
 * 测试 buildAiExamApplyReco 构建 AI 检查申请智能推荐、recommendExamApplyByAi AI 检查申请智能推荐、buildAiExamApplyRecoReport 构建检查申请智能推荐报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiExamApplyReco,
  buildAiExamApplyRecoReport,
  recommendExamApplyByAi,
  type AiExamApplyRecoInputV14,
} from "../../src/bff/aggregators/emrAiExamApplyRecoV14Aggregator";
import { emrAiExamApplyRecoV14Routes } from "../../src/bff/routes/emrAiExamApplyRecoV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiExamApplyReco 构建 AI 检查申请智能推荐", () => {
  // 手算：recordId='RECB066', dept='心内科' → 正确构建
  it("recordId='RECB066', dept='心内科' → 正确构建", () => {
    const base = buildAiExamApplyReco("RECB066", "心内科");
    expect(base.recordId).toBe("RECB066");
    expect(base.dept).toBe("心内科");
  });
});

describe("recommendExamApplyByAi 紧急", () => {
  // 手算：{diagnosis='急性心梗', symptom='胸痛'}
  // 手算：examName = '急性心梗'.includes('心梗')=true → '心电图+心肌酶谱'
  // 手算：urgency = '急性心梗'.includes('心梗')=true → '紧急'
  it("{diagnosis='急性心梗', symptom='胸痛'} → examName='心电图+心肌酶谱', urgency='紧急'", () => {
    const input: AiExamApplyRecoInputV14 = { diagnosis: "急性心梗", symptom: "胸痛" };
    const result = recommendExamApplyByAi(input);
    expect(result.examName).toBe("心电图+心肌酶谱");
    expect(result.urgency).toBe("紧急");
  });
});

describe("recommendExamApplyByAi 常规", () => {
  // 手算：{diagnosis='上呼吸道感染', symptom='咳嗽'}
  // 手算：examName = includes('心梗')=false；'咳嗽'.includes('腹痛')=false → '血常规+胸部X光'
  // 手算：urgency = includes('心梗')=false → '常规'
  it("{diagnosis='上呼吸道感染', symptom='咳嗽'} → examName='血常规+胸部X光', urgency='常规'", () => {
    const input: AiExamApplyRecoInputV14 = { diagnosis: "上呼吸道感染", symptom: "咳嗽" };
    const result = recommendExamApplyByAi(input);
    expect(result.examName).toBe("血常规+胸部X光");
    expect(result.urgency).toBe("常规");
  });
});

describe("buildAiExamApplyRecoReport 构建检查申请智能推荐报告", () => {
  // 手算：{examName='心电图+心肌酶谱', urgency='紧急'}
  // 手算：透传 examName + urgency
  it("{examName='心电图+心肌酶谱', urgency='紧急'} → 正确返回（透传）", () => {
    const report = buildAiExamApplyRecoReport({ examName: "心电图+心肌酶谱", urgency: "紧急" });
    expect(report.examName).toBe("心电图+心肌酶谱");
    expect(report.urgency).toBe("紧急");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-exam-apply-reco auth:true", () => {
    const def = (emrAiExamApplyRecoV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-exam-apply-reco");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
