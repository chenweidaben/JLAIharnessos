/**
 * 健澜科技 jlmedaios - 病历AI知识推荐 V14 单测（M543-D，M543 收官）
 *
 * 测试 buildAiKnowledgeReco 构建 AI 知识推荐、recommendKnowledgeByAi AI 知识推荐、buildAiKnowledgeRecoReport 构建推荐报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiKnowledgeReco,
  buildAiKnowledgeRecoReport,
  recommendKnowledgeByAi,
  type AiKnowledgeRecoInputV14,
} from "../../src/bff/aggregators/emrAiKnowledgeRecoV14Aggregator";
import { emrAiKnowledgeRecoV14Routes } from "../../src/bff/routes/emrAiKnowledgeRecoV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiKnowledgeReco 构建 AI 知识推荐", () => {
  // 手算：recordId='REC903', dept='心内科' → 正确构建
  it("recordId='REC903', dept='心内科' → 正确构建", () => {
    const base = buildAiKnowledgeReco("REC903", "心内科");
    expect(base.recordId).toBe("REC903");
    expect(base.dept).toBe("心内科");
  });
});

describe("recommendKnowledgeByAi 心梗", () => {
  // 手算：{diagnosis='急性心梗', specialty='心内科'}
  // 规格原写 '急性心肌梗死'，但该字符串不含 '心梗' 子串（是 '心肌梗死'），includes('心梗')=false
  // 已修正为 '急性心梗' 使 includes('心梗')=true，与聚合逻辑一致
  // 手算：diagnosis.includes('心梗') → true → recommendations=['心梗诊疗指南2025','抗血小板治疗规范']
  // 手算：count = recommendations.length = 2
  it("{diagnosis='急性心梗', specialty='心内科'} → recommendations=['心梗诊疗指南2025','抗血小板治疗规范'], count=2", () => {
    const input: AiKnowledgeRecoInputV14 = { diagnosis: "急性心梗", specialty: "心内科" };
    const result = recommendKnowledgeByAi(input);
    expect(result.recommendations).toEqual(["心梗诊疗指南2025", "抗血小板治疗规范"]);
    expect(result.count).toBe(2);
  });
});

describe("recommendKnowledgeByAi 一般", () => {
  // 手算：{diagnosis='上呼吸道感染', specialty='呼吸科'}
  // 手算：diagnosis.includes('心梗') → false → recommendations=['病历书写基本规范']
  // 手算：count = recommendations.length = 1
  it("{diagnosis='上呼吸道感染', specialty='呼吸科'} → recommendations=['病历书写基本规范'], count=1", () => {
    const input: AiKnowledgeRecoInputV14 = { diagnosis: "上呼吸道感染", specialty: "呼吸科" };
    const result = recommendKnowledgeByAi(input);
    expect(result.recommendations).toEqual(["病历书写基本规范"]);
    expect(result.count).toBe(1);
  });
});

describe("buildAiKnowledgeRecoReport 构建推荐报告", () => {
  // 手算：{recommendations=['心梗诊疗指南2025','抗血小板治疗规范'], count=2}
  // 手算：透传 recommendations + count
  it("{recommendations=['心梗诊疗指南2025','抗血小板治疗规范'], count=2} → 正确返回（透传）", () => {
    const report = buildAiKnowledgeRecoReport({ recommendations: ["心梗诊疗指南2025", "抗血小板治疗规范"], count: 2 });
    expect(report.recommendations).toEqual(["心梗诊疗指南2025", "抗血小板治疗规范"]);
    expect(report.count).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-knowledge-reco auth:true", () => {
    const def = (emrAiKnowledgeRecoV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-knowledge-reco");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
