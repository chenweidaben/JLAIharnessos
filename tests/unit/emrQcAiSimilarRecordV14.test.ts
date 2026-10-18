/**
 * 健澜科技 jlmedaios - 质控 AI 相似病历推荐 V14 单测（M499-C）
 *
 * 测试 recommendSimilar 推荐、buildSimilarReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildSimilarReport,
  recommendSimilar,
  type SimilarRecordV14,
} from "../../src/bff/aggregators/emrQcAiSimilarRecordV14Aggregator";
import { emrQcAiSimilarRecordV14Routes } from "../../src/bff/routes/emrQcAiSimilarRecordV14";
import type { RouteDef } from "../../src/bff/types";

describe("recommendSimilar 两条候选", () => {
  // 手算：recordId='R001', candidates=[{id:'R002',dept:'内科',score:0.9},{id:'R003',dept:'外科',score:0.7}] → 返回 2 条（排除自己后 2 条）
  it("recordId='R001', candidates 不含自己 → 返回 2 条", () => {
    const candidates = [
      { id: "R002", dept: "内科", score: 0.9 },
      { id: "R003", dept: "外科", score: 0.7 },
    ];
    const result: SimilarRecordV14[] = recommendSimilar("R001", candidates);
    expect(result.length).toBe(2);
  });
});

describe("recommendSimilar 排除自己", () => {
  // 手算：recordId='R001', candidates=[{id:'R001',dept:'内科',score:0.9},{id:'R002',dept:'外科',score:0.7}] → 返回 1 条（排除 R001 自己）
  it("recordId='R001', candidates 含自己 → 返回 1 条", () => {
    const candidates = [
      { id: "R001", dept: "内科", score: 0.9 },
      { id: "R002", dept: "外科", score: 0.7 },
    ];
    const result: SimilarRecordV14[] = recommendSimilar("R001", candidates);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe("R002");
  });
});

describe("buildSimilarReport 三条记录", () => {
  // 手算：3 条记录 → count=3（数组长度）
  it("3 条记录 → count=3", () => {
    const records: SimilarRecordV14[] = [
      { id: "R002", dept: "内科", score: 0.9 },
      { id: "R003", dept: "外科", score: 0.7 },
      { id: "R004", dept: "儿科", score: 0.85 },
    ];
    const report = buildSimilarReport(records);
    expect(report.count).toBe(3);
  });
});

describe("buildSimilarReport 空数组", () => {
  // 手算：空数组 → count=0（空数组长度）
  it("空数组 → count=0", () => {
    const records: SimilarRecordV14[] = [];
    const report = buildSimilarReport(records);
    expect(report.count).toBe(0);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-ai-similar-record auth:true", () => {
    const def = (emrQcAiSimilarRecordV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-ai-similar-record");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
