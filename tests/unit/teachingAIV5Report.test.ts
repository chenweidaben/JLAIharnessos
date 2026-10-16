/**
 * 健澜科技 jlmedaios - AI 教学助手 V5 纯函数单测（M259-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessStudentSkillV5,
  buildTeachingAIV5Report,
  generateCaseV5,
} from "../../src/bff/aggregators/teachingAIV5ReportAggregator";

describe("generateCaseV5", () => {
  it("心血管高级病例 → 10个学习点", () => {
    expect(generateCaseV5("心血管", "高级").learningPoints).toBe(10);
  });
});

describe("assessStudentSkillV5", () => {
  it("90分+5分钟+1个错误 → 优秀通过", () => {
    expect(assessStudentSkillV5({ score: 90, time: 5, errors: 1 }, { pass: 60, maxTime: 10, maxErrors: 3 }).pass).toBe(true);
  });
});

describe("buildTeachingAIV5Report", () => {
  it("生成带教数据", () => {
    const r = buildTeachingAIV5Report("30d");
    expect(r.teaching.rounds).toBeGreaterThan(0);
  });

  it("生成学习数据", () => {
    const r = buildTeachingAIV5Report("30d");
    expect(r.learning.time).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildTeachingAIV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
