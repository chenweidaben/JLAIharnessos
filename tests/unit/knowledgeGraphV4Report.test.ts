/**
 * 健澜科技 jlmedaios - 知识图谱 V4 纯函数单测（M248-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildKnowledgeGraphV4Report,
  inferClinicalRelationV4,
  queryKnowledgeGraphV4,
} from "../../src/bff/aggregators/knowledgeGraphV4ReportAggregator";

describe("queryKnowledgeGraphV4", () => {
  it("冠心病+并发症 → 心梗心衰", () => {
    expect(queryKnowledgeGraphV4("冠心病", "并发症").neighbors.length).toBe(2);
  });
});

describe("inferClinicalRelationV4", () => {
  it("胸痛+肌钙蛋白升高 → 急性冠脉综合征90%", () => {
    expect(inferClinicalRelationV4({ symptoms: ["胸痛"], labs: ["肌钙蛋白升高"] }).likely).toBe("急性冠脉综合征");
  });
});

describe("buildKnowledgeGraphV4Report", () => {
  it("生成实体数据", () => {
    const r = buildKnowledgeGraphV4Report("30d");
    expect(r.entities.disease).toBeGreaterThan(0);
  });

  it("生成推理数据", () => {
    const r = buildKnowledgeGraphV4Report("30d");
    expect(r.inference.qna).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildKnowledgeGraphV4Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
