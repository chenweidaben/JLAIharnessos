/**
 * 健澜科技 jlmedaios - 质控评分历史对比 V14 单测（M492-C）
 *
 * 测试 buildScoreHistory 构建、compareScoreHistory 对比、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildScoreHistory,
  compareScoreHistory,
  type ScoreHistoryV14,
  type ScoreHistoryRecordV14,
} from "../../src/bff/aggregators/emrQcScoreHistoryV14Aggregator";
import { emrQcScoreHistoryV14Routes } from "../../src/bff/routes/emrQcScoreHistoryV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildScoreHistory 3条记录", () => {
  // 手算：3 条记录（90/85/95）→ 正确构建
  it("3 条记录（90/85/95）→ 正确构建", () => {
    const records: ScoreHistoryRecordV14[] = [
      { date: "2026-01", score: 90 },
      { date: "2026-02", score: 85 },
      { date: "2026-03", score: 95 },
    ];
    const history: ScoreHistoryV14 = buildScoreHistory(records);
    expect(history.records.length).toBe(3);
  });
});

describe("compareScoreHistory 3条记录", () => {
  // 手算：[90, 85, 95] → current=95, previous=85, change=10（95-85=10）
  it("3 条记录（90/85/95）→ current=95, previous=85, change=10", () => {
    const records: ScoreHistoryRecordV14[] = [
      { date: "2026-01", score: 90 },
      { date: "2026-02", score: 85 },
      { date: "2026-03", score: 95 },
    ];
    const result = compareScoreHistory(records);
    expect(result.current).toBe(95);
    expect(result.previous).toBe(85);
    expect(result.change).toBe(10);
  });
});

describe("compareScoreHistory 1条记录", () => {
  // 手算：[90] → current=90, previous=0, change=90
  it("1 条记录（90）→ current=90, previous=0, change=90", () => {
    const records: ScoreHistoryRecordV14[] = [
      { date: "2026-01", score: 90 },
    ];
    const result = compareScoreHistory(records);
    expect(result.current).toBe(90);
    expect(result.previous).toBe(0);
    expect(result.change).toBe(90);
  });
});

describe("buildScoreHistory 2条记录", () => {
  // 手算：2 条记录 → 正确构建
  it("2 条记录 → 正确构建", () => {
    const records: ScoreHistoryRecordV14[] = [
      { date: "2026-01", score: 90 },
      { date: "2026-02", score: 85 },
    ];
    const history: ScoreHistoryV14 = buildScoreHistory(records);
    expect(history.records.length).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-score-history auth:true", () => {
    const def = (emrQcScoreHistoryV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-score-history");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
