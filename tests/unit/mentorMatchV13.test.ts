/**
 * 健澜科技 jlmedaios - 新手医生孵化与导师匹配 V13 单测（M298-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildOnboardingPlanV13,
  matchMentorV13,
  trackMentoringProgressV13,
  type MentorV13,
  type NewDoctorV13,
} from "../../src/bff/aggregators/mentorMatchV13Aggregator";
import { mentorMatchV13Routes } from "../../src/bff/routes/mentorMatchV13";

const mentors: MentorV13[] = [
  { doctorId: "m-1", name: "张主任", dept: "cardio", score: 69 },
  { doctorId: "m-2", name: "李医生", dept: "cardio", score: 38 },
  { doctorId: "m-3", name: "王医生", dept: "surgery", score: 21 },
];

const newDoctor: NewDoctorV13 = { doctorId: "n-1", name: "小陈", dept: "cardio" };

describe("matchMentorV13", () => {
  it("cardio 科室分数最高 → m-1(69)", () => {
    const m = matchMentorV13(newDoctor, mentors);
    expect(m?.doctorId).toBe("m-1");
  });
  it("无同科室导师 → null", () => {
    const other: NewDoctorV13 = { doctorId: "n-2", name: "小赵", dept: "icu" };
    expect(matchMentorV13(other, mentors)).toBeNull();
  });
});

describe("buildOnboardingPlanV13", () => {
  it("m-1(score=69) → experienceCount=7, totalMinutes=105", () => {
    const plan = buildOnboardingPlanV13(newDoctor, mentors[0]);
    expect(plan.experienceCount).toBe(7);
    expect(plan.totalMinutes).toBe(105);
  });
});

describe("trackMentoringProgressV13", () => {
  it("学3/7 → 完成率42.9% 剩余60分钟", () => {
    const plan = buildOnboardingPlanV13(newDoctor, mentors[0]);
    const p = trackMentoringProgressV13(plan, 3);
    expect(p.completionRate).toBe(42.9);
    expect(p.remainingMinutes).toBe(60);
  });
});

describe("mentorMatchV13Routes 写路由", () => {
  it("POST /api/v1/mentor-match/:newDoctorId/accept 路由存在且 auth:true", () => {
    const route = mentorMatchV13Routes.find(
      (r) => r.method === "POST" && r.path === "/api/v1/mentor-match/:newDoctorId/accept",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
