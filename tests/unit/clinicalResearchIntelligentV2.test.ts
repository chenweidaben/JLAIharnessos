/**
 * 健澜科技 jlmedaios - 临床科研智能化 V2 纯函数单测（M233-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  aiLiteratureReview,
  buildClinicalResearchIntelligentV2,
  predictClinicalOutcome,
} from "../../src/bff/aggregators/clinicalResearchIntelligentV2Aggregator";

describe("aiLiteratureReview", () => {
  it("糖尿病主题 → 500篇文献", () => {
    expect(aiLiteratureReview("糖尿病").papers).toBe(500);
  });
});

describe("predictClinicalOutcome", () => {
  it("高龄+合并症 → 高风险", () => {
    expect(predictClinicalOutcome("高龄合并症", "Nomogram").risk).toBe("高");
  });

  it("普通患者 → 低风险", () => {
    expect(predictClinicalOutcome("青年", "Nomogram").risk).toBe("低");
  });
});

describe("buildClinicalResearchIntelligentV2", () => {
  it("生成RWS数据", () => {
    const r = buildClinicalResearchIntelligentV2("30d");
    expect(r.rws.studies).toBeGreaterThan(0);
  });

  it("生成病例检索数据", () => {
    const r = buildClinicalResearchIntelligentV2("30d");
    expect(r.caseSearch.semantic).toBeGreaterThan(0);
  });

  it("生成论文数据", () => {
    const r = buildClinicalResearchIntelligentV2("30d");
    expect(r.paperWriting.drafts).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildClinicalResearchIntelligentV2("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
