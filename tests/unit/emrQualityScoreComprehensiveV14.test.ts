/**
 * 健澜科技 jlmedaios - 病历质量综合评分 V14 单测（M536-A）
 *
 * 测试 buildQualityScoreComprehensive 构建质量综合评分、computeQualityScoreComprehensive 质量综合评分、buildQualityScoreComprehensiveReport 构建报告、读路由 GET auth:true。
 * 避让 M465-B 旧 emrQualityScoreV14（实时评分仪表盘），采用 -comprehensive 后缀。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildQualityScoreComprehensive,
  buildQualityScoreComprehensiveReport,
  computeQualityScoreComprehensive,
  type QualityScoreComprehensiveInputV14,
} from "../../src/bff/aggregators/emrQualityScoreComprehensiveV14Aggregator";
import { emrQualityScoreComprehensiveV14Routes } from "../../src/bff/routes/emrQualityScoreComprehensiveV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildQualityScoreComprehensive 构建质量综合评分", () => {
  // 手算：recordId='REC300', dept='心内科' → 正确构建
  it("recordId='REC300', dept='心内科' → 正确构建", () => {
    const score = buildQualityScoreComprehensive("REC300", "心内科");
    expect(score.recordId).toBe("REC300");
    expect(score.dept).toBe("心内科");
  });
});

describe("computeQualityScoreComprehensive 优秀", () => {
  // 手算：{block=0, major=0, minor=1}
  // 手算：扣分 = 0×15 + 0×8 + 1×3 = 3
  // 手算：score = 100 - 3 = 97
  // 手算：grade = 97 >= 90 → '优秀'
  it("{block=0, major=0, minor=1} → score=97, grade='优秀'", () => {
    const input: QualityScoreComprehensiveInputV14 = { block: 0, major: 0, minor: 1 };
    const result = computeQualityScoreComprehensive(input);
    expect(result.score).toBe(97);
    expect(result.grade).toBe("优秀");
  });
});

describe("computeQualityScoreComprehensive 不合格", () => {
  // 手算：{block=2, major=3, minor=5}
  // 手算：扣分 = 2×15 + 3×8 + 5×3 = 30 + 24 + 15 = 69
  // 手算：score = 100 - 69 = 31
  // 手算：grade = 31 < 70 → '不合格'
  it("{block=2, major=3, minor=5} → score=31, grade='不合格'", () => {
    const input: QualityScoreComprehensiveInputV14 = { block: 2, major: 3, minor: 5 };
    const result = computeQualityScoreComprehensive(input);
    expect(result.score).toBe(31);
    expect(result.grade).toBe("不合格");
  });
});

describe("buildQualityScoreComprehensiveReport 构建报告", () => {
  // 手算：{score=97, grade='优秀'}
  // 手算：透传 score + grade
  it("{score=97, grade='优秀'} → 正确返回（透传）", () => {
    const report = buildQualityScoreComprehensiveReport({ score: 97, grade: "优秀" });
    expect(report.score).toBe(97);
    expect(report.grade).toBe("优秀");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-quality-score-comprehensive auth:true", () => {
    const def = (emrQualityScoreComprehensiveV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-quality-score-comprehensive");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
