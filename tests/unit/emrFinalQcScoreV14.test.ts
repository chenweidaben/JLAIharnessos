/**
 * 健澜科技 jlmedaios - 病历终末质控评分 V14 单测（M527-B）
 *
 * 测试 buildFinalQcScore 构建评分、calculateFinalScore 终末评分、buildFinalQcScoreReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildFinalQcScore,
  buildFinalQcScoreReport,
  calculateFinalScore,
  type FinalQcScoreInputV14,
} from "../../src/bff/aggregators/emrFinalQcScoreV14Aggregator";
import { emrFinalQcScoreV14Routes } from "../../src/bff/routes/emrFinalQcScoreV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildFinalQcScore 构建评分", () => {
  // 手算：recordId='REC040', dept='心内科' → 正确构建
  it("recordId='REC040', dept='心内科' → 正确构建", () => {
    const score = buildFinalQcScore("REC040", "心内科");
    expect(score.recordId).toBe("REC040");
    expect(score.dept).toBe("心内科");
  });
});

describe("calculateFinalScore 优秀", () => {
  // 手算：{blockDefects:0, majorDefects:0, minorDefects:1}
  // 手算：扣分 = 0×15 + 0×8 + 1×3 = 3
  // 手算：finalScore = Math.max(0, 100-3) = 97
  // 手算：97 >= 90 → grade='优秀'
  it("{blockDefects:0, majorDefects:0, minorDefects:1} → finalScore=97, grade='优秀'", () => {
    const input: FinalQcScoreInputV14 = {
      blockDefects: 0,
      majorDefects: 0,
      minorDefects: 1,
    };
    const result = calculateFinalScore(input);
    expect(result.finalScore).toBe(97);
    expect(result.grade).toBe("优秀");
  });
});

describe("calculateFinalScore 不合格", () => {
  // 手算：{blockDefects:2, majorDefects:3, minorDefects:5}
  // 手算：扣分 = 2×15 + 3×8 + 5×3 = 30+24+15 = 69
  // 手算：finalScore = Math.max(0, 100-69) = 31
  // 手算：31 < 70 → grade='不合格'
  it("{blockDefects:2, majorDefects:3, minorDefects:5} → finalScore=31, grade='不合格'", () => {
    const input: FinalQcScoreInputV14 = {
      blockDefects: 2,
      majorDefects: 3,
      minorDefects: 5,
    };
    const result = calculateFinalScore(input);
    expect(result.finalScore).toBe(31);
    expect(result.grade).toBe("不合格");
  });
});

describe("buildFinalQcScoreReport 构建报告", () => {
  // 手算：{finalScore:97, grade:'优秀'}
  // 手算：透传 finalScore + grade
  it("{finalScore:97, grade:'优秀'} → 正确返回（透传）", () => {
    const report = buildFinalQcScoreReport({ finalScore: 97, grade: "优秀" });
    expect(report.finalScore).toBe(97);
    expect(report.grade).toBe("优秀");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-final-qc-score auth:true", () => {
    const def = (emrFinalQcScoreV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-final-qc-score");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
