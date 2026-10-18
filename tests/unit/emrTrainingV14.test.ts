/**
 * 健澜科技 jlmedaios - 病历质控培训考核模块 V14 单测（M467-D）
 *
 * 测试 buildTrainingModule 题数≥3、scoreExam 评分计算、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildTrainingModule,
  scoreExam,
} from "../../src/bff/aggregators/emrTrainingV14Aggregator";
import { emrTrainingV14Routes } from "../../src/bff/routes/emrTrainingV14";
import type { RouteDef } from "../../src/bff/types";

const module = buildTrainingModule("COURSE-001");
const questions = module.questions;

describe("buildTrainingModule 题数", () => {
  // 手算：内置 3 道考题 → questions.length=3 ≥ 3
  it("questions.length ≥ 3", () => {
    expect(questions.length).toBeGreaterThanOrEqual(3);
  });
});

describe("scoreExam 全对", () => {
  // 手算：3 题全对 → correctCount=3, 3/3×100=100, pass=true
  it("3 题全对 → correctCount=3, score=100, pass=true", () => {
    const answers = questions.map((q) => q.answerIndex);
    const result = scoreExam(answers, questions);
    expect(result.correctCount).toBe(3);
    expect(result.score).toBe(100);
    expect(result.pass).toBe(true);
  });
});

describe("scoreExam 对 2 题", () => {
  // 手算：3 题对 2 题 → 2/3×100=66.67 → Math.round=67, 67≥60 → pass=true
  it("3 题对 2 题 → correctCount=2, score=67", () => {
    const answers = [questions[0]?.answerIndex ?? 0, questions[1]?.answerIndex ?? 0, -1];
    const result = scoreExam(answers, questions);
    expect(result.correctCount).toBe(2);
    expect(result.score).toBe(67);
  });
});

describe("scoreExam 对 1 题", () => {
  // 手算：3 题对 1 题 → 1/3×100=33.33 → Math.round=33, 33<60 → pass=false
  it("3 题对 1 题 → score=33, pass=false", () => {
    const answers = [questions[0]?.answerIndex ?? 0, -1, -1];
    const result = scoreExam(answers, questions);
    expect(result.score).toBe(33);
    expect(result.pass).toBe(false);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-training auth:true", () => {
    const def = (emrTrainingV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-training");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
