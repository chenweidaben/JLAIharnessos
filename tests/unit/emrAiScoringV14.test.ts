/**
 * 健澜科技 jlmedaios - 病历AI质控评分 V14 单测（M543-B）
 *
 * 测试 buildAiScoring 构建 AI 评分、scoreByAi AI 质控评分、buildAiScoringReport 构建评分报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiScoring,
  buildAiScoringReport,
  scoreByAi,
  type AiScoringInputV14,
} from "../../src/bff/aggregators/emrAiScoringV14Aggregator";
import { emrAiScoringV14Routes } from "../../src/bff/routes/emrAiScoringV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiScoring 构建 AI 评分", () => {
  // 手算：recordId='REC901', dept='心内科' → 正确构建
  it("recordId='REC901', dept='心内科' → 正确构建", () => {
    const base = buildAiScoring("REC901", "心内科");
    expect(base.recordId).toBe("REC901");
    expect(base.dept).toBe("心内科");
  });
});

describe("scoreByAi 优秀", () => {
  // 手算：{block=0, major=0, minor=1}
  // 手算：扣分 = 0×15 + 0×8 + 1×3 = 3
  // 手算：aiScore = Math.max(0, Math.min(100, 100-3)) = 97
  // 手算：aiGrade = 97>=90 → '优秀'
  it("{block=0, major=0, minor=1} → aiScore=97, aiGrade='优秀'", () => {
    const input: AiScoringInputV14 = { block: 0, major: 0, minor: 1 };
    const result = scoreByAi(input);
    expect(result.aiScore).toBe(97);
    expect(result.aiGrade).toBe("优秀");
  });
});

describe("scoreByAi 不合格", () => {
  // 手算：{block=2, major=3, minor=5}
  // 手算：扣分 = 2×15 + 3×8 + 5×3 = 30 + 24 + 15 = 69
  // 手算：aiScore = Math.max(0, Math.min(100, 100-69)) = 31
  // 手算：aiGrade = 31<70 → '不合格'
  it("{block=2, major=3, minor=5} → aiScore=31, aiGrade='不合格'", () => {
    const input: AiScoringInputV14 = { block: 2, major: 3, minor: 5 };
    const result = scoreByAi(input);
    expect(result.aiScore).toBe(31);
    expect(result.aiGrade).toBe("不合格");
  });
});

describe("buildAiScoringReport 构建评分报告", () => {
  // 手算：{aiScore=97, aiGrade='优秀'}
  // 手算：透传 aiScore + aiGrade
  it("{aiScore=97, aiGrade='优秀'} → 正确返回（透传）", () => {
    const report = buildAiScoringReport({ aiScore: 97, aiGrade: "优秀" });
    expect(report.aiScore).toBe(97);
    expect(report.aiGrade).toBe("优秀");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-scoring auth:true", () => {
    const def = (emrAiScoringV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-scoring");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
