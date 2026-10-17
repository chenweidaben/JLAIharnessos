/**
 * 健澜科技 jlmedaios - 病历知识自动关联 V13 单测（M319-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeLinkHitRateV13,
  linkRelatedSOPsV13,
  linkSimilarCasesV13,
  type MedicalCaseV13,
  type SopItemV13,
} from "../../src/bff/aggregators/knowledgeLinkV13Aggregator";
import { knowledgeLinkV13Routes } from "../../src/bff/routes/knowledgeLinkV13";

const currentCase: MedicalCaseV13 = { caseId: "c1", diagnosis: "急性心肌梗死" };

const history: MedicalCaseV13[] = [
  { caseId: "h1", diagnosis: "急性心肌梗死" },
  { caseId: "h2", diagnosis: "陈旧性心肌梗死" },
  { caseId: "h3", diagnosis: "心绞痛" },
  { caseId: "h4", diagnosis: "急性心肌梗死合并心衰" },
  { caseId: "h5", diagnosis: "肺炎" },
];

const sops: SopItemV13[] = [
  { sopId: "s1", title: "急性心梗诊疗 SOP", keywords: ["心肌梗死", "心梗"] },
  { sopId: "s2", title: "心衰诊疗 SOP", keywords: ["心衰"] },
  { sopId: "s3", title: "肺炎诊疗 SOP", keywords: ["肺炎"] },
];

describe("linkSimilarCasesV13", () => {
  // 算式：当前诊断"急性心肌梗死"关键词 = ["急性","心肌梗死"]
  // h1="急性心肌梗死" 包含"急性"或"心肌梗死" → 匹配
  // h2="陈旧性心肌梗死" 包含"心肌梗死" → 匹配
  // h3="心绞痛" 不包含 → 不匹配
  // h4="急性心肌梗死合并心衰" 包含"急性"或"心肌梗死" → 匹配
  // h5="肺炎" 不包含 → 不匹配
  it("相似病例 = 3（h1/h2/h4）", () => {
    expect(linkSimilarCasesV13(currentCase, history).length).toBe(3);
  });
});

describe("linkRelatedSOPsV13", () => {
  // 算式：关键词 = ["急性","心肌梗死"]
  // s1 keywords=["心肌梗死","心梗"] → "心肌梗死"匹配 → 关联
  // s2 keywords=["心衰"] → 不匹配 → 不关联
  // s3 keywords=["肺炎"] → 不匹配 → 不关联
  it("相关 SOP = 1（s1）", () => {
    expect(linkRelatedSOPsV13(currentCase, sops).length).toBe(1);
  });
});

describe("computeLinkHitRateV13", () => {
  // 算式：尝试 5 个，成功 4 个 → 4/5×100 = 80
  it("hitRate = 80", () => {
    expect(computeLinkHitRateV13(5, 4)).toBe(80);
  });
  it("空态 → 0", () => {
    expect(computeLinkHitRateV13(0, 0)).toBe(0);
  });
});

describe("knowledgeLinkV13Routes 读路由", () => {
  it("GET /api/v1/knowledge-link 路由存在且 auth:true", () => {
    const route = knowledgeLinkV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/knowledge-link",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
