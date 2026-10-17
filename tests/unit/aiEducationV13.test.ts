/**
 * 健澜科技 jlmedaios - AI 教学培训 V13 单测（M366-D，M366 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAiExamPassRateV13,
  computeAiTeachingCourseCountV13,
  computeAiTrainingParticipantCountV13,
  type AiEducationRecordV13,
} from "../../src/bff/aggregators/aiEducationV13Aggregator";
import { aiEducationV13Routes } from "../../src/bff/routes/aiEducationV13";

const records: AiEducationRecordV13[] = [
  { teachingCourseCount: 5, trainingParticipantCount: 100, examPassed: 90, examTaken: 100 },
  { teachingCourseCount: 5, trainingParticipantCount: 100, examPassed: 90, examTaken: 100 },
];

describe("computeAiTeachingCourseCountV13", () => {
  // 算式：5+5 = 10
  it("AI 教学课程数 = 10", () => {
    expect(computeAiTeachingCourseCountV13(records)).toBe(10);
  });
  it("空态 → 0", () => {
    expect(computeAiTeachingCourseCountV13([])).toBe(0);
  });
});

describe("computeAiTrainingParticipantCountV13", () => {
  // 算式：100+100 = 200
  it("AI 培训人次 = 200", () => {
    expect(computeAiTrainingParticipantCountV13(records)).toBe(200);
  });
});

describe("computeAiExamPassRateV13", () => {
  // 算式：(90+90)/(100+100) = 180/200×100 = 90.00
  it("AI 考核通过率 = 90.00%", () => {
    expect(computeAiExamPassRateV13(records)).toBe(90.00);
  });
});

describe("aiEducationV13Routes 读路由", () => {
  it("GET /api/v1/ai-education 路由存在且 auth:true", () => {
    const route = aiEducationV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/ai-education",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
