/**
 * 健澜科技 jlmedaios - 医生显式反馈闭环 V13 单测（M301-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  collectDoctorFeedbackV13,
  computeFeedbackSignalV13,
  triggerExperienceUpdateByFeedbackV13,
  type DoctorFeedbackV13,
} from "../../src/bff/aggregators/doctorFeedbackV13Aggregator";
import { doctorFeedbackV13Routes } from "../../src/bff/routes/doctorFeedbackV13";

const feedbacks: DoctorFeedbackV13[] = [
  collectDoctorFeedbackV13("s-1", "d-1", "accepted", ""),
  collectDoctorFeedbackV13("s-2", "d-2", "accepted", ""),
  collectDoctorFeedbackV13("s-3", "d-3", "modified", "剂量调整"),
  collectDoctorFeedbackV13("s-4", "d-4", "modified", "时机推后"),
  collectDoctorFeedbackV13("s-5", "d-5", "rejected", "不符合本院"),
];

describe("collectDoctorFeedbackV13", () => {
  it("返回 feedback 条目，字段齐全", () => {
    const f = collectDoctorFeedbackV13("s-9", "d-9", "accepted", "");
    expect(f.suggestionId).toBe("s-9");
    expect(f.action).toBe("accepted");
  });
});

describe("computeFeedbackSignalV13", () => {
  it("5条：采纳2/5=40% 修改2/5=40% 驳回1/5=20%", () => {
    const s = computeFeedbackSignalV13(feedbacks);
    expect(s.acceptedCount).toBe(2);
    expect(s.modifiedCount).toBe(2);
    expect(s.rejectedCount).toBe(1);
    expect(s.adoptionRate).toBe(40);
    expect(s.modificationRate).toBe(40);
    expect(s.rejectionRate).toBe(20);
  });
  it("空态 → 三率=0", () => {
    const s = computeFeedbackSignalV13([]);
    expect(s.adoptionRate).toBe(0);
    expect(s.needsReview).toBe(false);
  });
});

describe("triggerExperienceUpdateByFeedbackV13", () => {
  it("modificationRate=40 ≥ 40 → needsReview=true", () => {
    const s = computeFeedbackSignalV13(feedbacks);
    expect(triggerExperienceUpdateByFeedbackV13(s)).toBe(true);
  });
  it("rejectionRate=30 ≥ 30 → needsReview=true", () => {
    expect(triggerExperienceUpdateByFeedbackV13({ modificationRate: 10, rejectionRate: 30 })).toBe(true);
  });
  it("rejection=10 modification=10 → false", () => {
    expect(triggerExperienceUpdateByFeedbackV13({ modificationRate: 10, rejectionRate: 10 })).toBe(false);
  });
});

describe("doctorFeedbackV13Routes 写路由", () => {
  it("POST /api/v1/feedback 路由存在且 auth:true", () => {
    const route = doctorFeedbackV13Routes.find(
      (r) => r.method === "POST" && r.path === "/api/v1/feedback",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
