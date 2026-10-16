/**
 * 健澜科技 jlmedaios - 知识图谱 V3 纯函数单测（M238-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildKnowledgeGraphV3Report,
  inferClinicalRelation,
  queryKnowledgeGraph,
} from "../../src/bff/aggregators/knowledgeGraphV3ReportAggregator";

describe("queryKnowledgeGraph", () => {
  it("肺炎-症状 → 发热咳嗽", () => {
    expect(queryKnowledgeGraph("肺炎", "症状").nodes.length).toBeGreaterThan(0);
  });
});

describe("inferClinicalRelation", () => {
  it("发热+咳嗽 → 肺炎", () => {
    expect(inferClinicalRelation(["发热", "咳嗽"]).diagnosis).toBe("肺炎");
  });
});

describe("buildKnowledgeGraphV3Report", () => {
  it("生成疾病数据", () => {
    const r = buildKnowledgeGraphV3Report("30d");
    expect(r.disease.nodes).toBeGreaterThan(0);
  });

  it("生成指南数据", () => {
    const r = buildKnowledgeGraphV3Report("30d");
    expect(r.guideline.recommendations).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildKnowledgeGraphV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
