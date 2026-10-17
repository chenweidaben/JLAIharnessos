/**
 * 健澜科技 jlmedaios - MUSE 建议采纳反馈 V13 单测（M319-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  classifyFeedbackTypesV13,
  computeDoctorHitRateV13,
  flagLowHitRateDoctorsV13,
  type MuseFeedbackV13,
} from "../../src/bff/aggregators/museFeedbackV13Aggregator";
import { museFeedbackV13Routes } from "../../src/bff/routes/museFeedbackV13";

const feedbacks: MuseFeedbackV13[] = [
  { feedbackId: "f1", doctorId: "D01", dept: "cardio", feedbackType: "adopt" },
  { feedbackId: "f2", doctorId: "D01", dept: "cardio", feedbackType: "adopt" },
  { feedbackId: "f3", doctorId: "D01", dept: "cardio", feedbackType: "adopt" },
  { feedbackId: "f4", doctorId: "D01", dept: "cardio", feedbackType: "adopt" },
  { feedbackId: "f5", doctorId: "D01", dept: "cardio", feedbackType: "adopt" },
  { feedbackId: "f6", doctorId: "D01", dept: "cardio", feedbackType: "adopt" },
  { feedbackId: "f7", doctorId: "D01", dept: "cardio", feedbackType: "adopt" },
  { feedbackId: "f8", doctorId: "D01", dept: "cardio", feedbackType: "ignore" },
  { feedbackId: "f9", doctorId: "D01", dept: "cardio", feedbackType: "ignore" },
  { feedbackId: "f10", doctorId: "D01", dept: "cardio", feedbackType: "error" },
  { feedbackId: "f11", doctorId: "D02", dept: "cardio", feedbackType: "adopt" },
  { feedbackId: "f12", doctorId: "D02", dept: "cardio", feedbackType: "adopt" },
  { feedbackId: "f13", doctorId: "D02", dept: "cardio", feedbackType: "adopt" },
  { feedbackId: "f14", doctorId: "D02", dept: "cardio", feedbackType: "adopt" },
  { feedbackId: "f15", doctorId: "D02", dept: "cardio", feedbackType: "adopt" },
  { feedbackId: "f16", doctorId: "D02", dept: "cardio", feedbackType: "adopt" },
  { feedbackId: "f17", doctorId: "D02", dept: "cardio", feedbackType: "adopt" },
  { feedbackId: "f18", doctorId: "D02", dept: "cardio", feedbackType: "adopt" },
  { feedbackId: "f19", doctorId: "D02", dept: "cardio", feedbackType: "ignore" },
  { feedbackId: "f20", doctorId: "D02", dept: "cardio", feedbackType: "error" },
  { feedbackId: "f21", doctorId: "D03", dept: "cardio", feedbackType: "adopt" },
  { feedbackId: "f22", doctorId: "D03", dept: "cardio", feedbackType: "adopt" },
  { feedbackId: "f23", doctorId: "D03", dept: "cardio", feedbackType: "adopt" },
  { feedbackId: "f24", doctorId: "D03", dept: "cardio", feedbackType: "adopt" },
  { feedbackId: "f25", doctorId: "D03", dept: "cardio", feedbackType: "adopt" },
  { feedbackId: "f26", doctorId: "D03", dept: "cardio", feedbackType: "ignore" },
  { feedbackId: "f27", doctorId: "D03", dept: "cardio", feedbackType: "ignore" },
  { feedbackId: "f28", doctorId: "D03", dept: "cardio", feedbackType: "ignore" },
  { feedbackId: "f29", doctorId: "D03", dept: "cardio", feedbackType: "error" },
  { feedbackId: "f30", doctorId: "D03", dept: "cardio", feedbackType: "error" },
];

describe("computeDoctorHitRateV13", () => {
  // 算式：D01 10 反馈中采纳 = f1-f7 = 7 → 7/10×100 = 70
  it("D01 hitRate = 70", () => {
    expect(computeDoctorHitRateV13(feedbacks, "D01")).toBe(70);
  });
  it("空态 → 0", () => {
    expect(computeDoctorHitRateV13([], "D01")).toBe(0);
  });
});

describe("classifyFeedbackTypesV13", () => {
  // 算式：adopt = D01(7) + D02(8) + D03(5) = 20
  // ignore = D01(2) + D02(1) + D03(3) = 6
  // error = D01(1) + D02(1) + D03(2) = 4
  it("adopt=20, ignore=6, error=4", () => {
    const c = classifyFeedbackTypesV13(feedbacks);
    expect(c.adopt).toBe(20);
    expect(c.ignore).toBe(6);
    expect(c.error).toBe(4);
  });
});

describe("flagLowHitRateDoctorsV13", () => {
  // 算式：D01=70, D02=80, D03=50；threshold=60
  // D03=50<60 → 红牌；D01=70>=60 不红牌；D02=80>=60 不红牌
  it("低命中率 = D03", () => {
    const doctorRates = [
      { doctorId: "D01", hitRate: 70 },
      { doctorId: "D02", hitRate: 80 },
      { doctorId: "D03", hitRate: 50 },
    ];
    const low = flagLowHitRateDoctorsV13(doctorRates, 60);
    expect(low.length).toBe(1);
    expect(low[0].doctorId).toBe("D03");
  });
});

describe("museFeedbackV13Routes 读路由", () => {
  it("GET /api/v1/muse-feedback 路由存在且 auth:true", () => {
    const route = museFeedbackV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/muse-feedback",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
