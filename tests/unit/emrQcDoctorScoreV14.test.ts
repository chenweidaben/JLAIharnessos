/**
 * 健澜科技 jlmedaios - 质控医生评分 V14 单测（M494-A）
 *
 * 测试 buildDoctorScore 构建、aggregateDoctorScores 聚合、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDoctorScore,
  aggregateDoctorScores,
  type DoctorScoreV14,
} from "../../src/bff/aggregators/emrQcDoctorScoreV14Aggregator";
import { emrQcDoctorScoreV14Routes } from "../../src/bff/routes/emrQcDoctorScoreV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildDoctorScore 张医生", () => {
  // 手算：doctor='张医生', dept='内科', score=92 → 正确构建
  it("doctor='张医生', dept='内科', score=92 → 正确构建", () => {
    const score: DoctorScoreV14 = buildDoctorScore("张医生", "内科", 92);
    expect(score.doctor).toBe("张医生");
    expect(score.dept).toBe("内科");
    expect(score.score).toBe(92);
  });
});

describe("aggregateDoctorScores 3医生", () => {
  // 手算：3 个医生（92/85/95）→ count=3, avgScore=90.7（(92+85+95)/3=272/3≈90.67→保留1位=90.7）, maxScore=95
  it("3 个医生（92/85/95）→ count=3, avgScore=90.7, maxScore=95", () => {
    const scores = [
      { doctor: "张医生", score: 92 },
      { doctor: "王医生", score: 85 },
      { doctor: "李医生", score: 95 },
    ];
    const result = aggregateDoctorScores(scores);
    expect(result.count).toBe(3);
    expect(result.avgScore).toBeCloseTo(90.7);
    expect(result.maxScore).toBe(95);
  });
});

describe("aggregateDoctorScores 空数组", () => {
  // 手算：空数组 → count=0, avgScore=0
  it("空数组 → count=0, avgScore=0", () => {
    const scores: { doctor: string; score: number }[] = [];
    const result = aggregateDoctorScores(scores);
    expect(result.count).toBe(0);
    expect(result.avgScore).toBe(0);
  });
});

describe("buildDoctorScore 李医生", () => {
  // 手算：doctor='李医生', dept='外科', score=88 → 正确构建
  it("doctor='李医生', dept='外科', score=88 → 正确构建", () => {
    const score: DoctorScoreV14 = buildDoctorScore("李医生", "外科", 88);
    expect(score.doctor).toBe("李医生");
    expect(score.dept).toBe("外科");
    expect(score.score).toBe(88);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-doctor-score auth:true", () => {
    const def = (emrQcDoctorScoreV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-doctor-score");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
