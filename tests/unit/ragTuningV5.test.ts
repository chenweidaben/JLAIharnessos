/**
 * 健澜科技 jlmedaios - RAG 知识库检索优化 V5 单测（M280-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildRagTuningV5Report,
  embedQueryV5,
  hybridSearchV5,
  rerankV5,
} from "../../src/bff/aggregators/ragTuningV5Aggregator";
import { ragTuningV5Routes } from "../../src/bff/routes/ragTuningV5";

describe("embedQueryV5", () => {
  it("返回4维归一向量", () => {
    const vec = embedQueryV5("高血压");
    expect(vec.length).toBe(4);
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    expect(norm).toBeCloseTo(1, 1);
  });
});

describe("hybridSearchV5", () => {
  it("向量0.9关键词0.8→0.7*0.9+0.3*0.8=0.87", () => {
    const r = hybridSearchV5([{ docId: "d1", chunkId: "c1", vectorScore: 0.9, keywordScore: 0.8 }]);
    expect(r[0].finalScore).toBe(0.87);
  });
});

describe("rerankV5", () => {
  it("按finalScore降序取top2", () => {
    const results = rerankV5(
      hybridSearchV5([
        { docId: "d1", chunkId: "c1", vectorScore: 0.9, keywordScore: 0.8 },
        { docId: "d2", chunkId: "c2", vectorScore: 0.7, keywordScore: 0.9 },
        { docId: "d3", chunkId: "c3", vectorScore: 0.5, keywordScore: 0.4 },
      ]),
      2,
    );
    // d1:0.87, d2:0.76, d3:0.47 → top2=[d1,d2]
    expect(results.length).toBe(2);
    expect(results[0].docId).toBe("d1");
  });
});

describe("buildRagTuningV5Report", () => {
  it("3块2命中→命中率66.7%", () => {
    const chunks = [
      { retrievalCount: 100, hit: true },
      { retrievalCount: 80, hit: true },
      { retrievalCount: 50, hit: false },
    ];
    expect(buildRagTuningV5Report(chunks, 3).avgHitRate).toBe(66.7);
  });
});

describe("写权限", () => {
  it("POST /reindex 路由启用 auth 并声明写权限", () => {
    const postRoute = ragTuningV5Routes.find((r) => r.method === "POST");
    expect(postRoute).toBeDefined();
    expect(postRoute!.auth).toBe(true);
    expect(postRoute!.path).toBe("/api/v1/rag-tuning/reindex");
  });
});
