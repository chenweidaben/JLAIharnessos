/**
 * 健澜科技 jlmedaios - 质控 AI 相似病历推荐明细 V14 单测（M508-C，-detail 避让）
 *
 * 测试 recommendSimilar 推荐、buildSimilarReport 报告、POST 路由 auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildSimilarReport,
  recommendSimilar,
  type AiSimilarRecordResultDetailV14,
} from "../../src/bff/aggregators/emrQcAiSimilarRecordDetailV14Aggregator";
import { emrQcAiSimilarRecordDetailV14Routes } from "../../src/bff/routes/emrQcAiSimilarRecordDetailV14";
import type { RouteDef } from "../../src/bff/types";

describe("recommendSimilar 急性阑尾炎", () => {
  // 手算：diagnosis='急性阑尾炎' → 关键词'阑尾'匹配 → records 包含 2 条以上推荐
  it("diagnosis='急性阑尾炎' → records 包含 2 条以上推荐", () => {
    const result = recommendSimilar("急性阑尾炎");
    expect(result.records.length).toBeGreaterThanOrEqual(2);
  });
});

describe("recommendSimilar 肺炎", () => {
  // 手算：diagnosis='肺炎' → 关键词'肺炎'匹配 → records 非空
  it("diagnosis='肺炎' → records 非空", () => {
    const result = recommendSimilar("肺炎");
    expect(result.records.length).toBeGreaterThan(0);
  });
});

describe("buildSimilarReport 三条记录", () => {
  // 手算：3 条记录（95/88/82）
  // count = 3
  // avgSimilarity = (95+88+82)/3 = 265/3 ≈ 88.3 → Math.round = 88
  it("3 条记录（95/88/82）→ count=3, avgSimilarity=88", () => {
    const result: AiSimilarRecordResultDetailV14 = {
      records: [
        { title: "病历1", similarity: 95 },
        { title: "病历2", similarity: 88 },
        { title: "病历3", similarity: 82 },
      ],
    };
    const report = buildSimilarReport(result);
    expect(report.count).toBe(3);
    expect(report.avgSimilarity).toBe(88);
  });
});

describe("recommendSimilar 骨折", () => {
  // 手算：diagnosis='骨折' → 关键词'骨折'匹配 → records 非空
  it("diagnosis='骨折' → records 非空", () => {
    const result = recommendSimilar("骨折");
    expect(result.records.length).toBeGreaterThan(0);
  });
});

describe("POST 路由", () => {
  it("POST /api/v1/emr-qc-ai-similar-record-detail auth:true", () => {
    const def = (emrQcAiSimilarRecordDetailV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-qc-ai-similar-record-detail");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
