/**
 * 健澜科技 jlmedaios - 出院随访依从性 V13 单测（M316-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeFollowUpAdherenceScoreV13,
  computeFollowUpRatesV13,
  identifyLostToFollowUpV13,
  type FollowUpPatientV13,
} from "../../src/bff/aggregators/followUpAdherenceV13Aggregator";
import { followUpAdherenceV13Routes } from "../../src/bff/routes/followUpAdherenceV13";

const patients: FollowUpPatientV13[] = [
  { patientId: "p1", dept: "cardio", shouldFollowUp: true, isFollowedUp: true },
  { patientId: "p2", dept: "cardio", shouldFollowUp: true, isFollowedUp: true },
  { patientId: "p3", dept: "cardio", shouldFollowUp: true, isFollowedUp: true },
  { patientId: "p4", dept: "cardio", shouldFollowUp: true, isFollowedUp: true },
  { patientId: "p5", dept: "cardio", shouldFollowUp: true, isFollowedUp: true },
  { patientId: "p6", dept: "cardio", shouldFollowUp: true, isFollowedUp: true },
  { patientId: "p7", dept: "cardio", shouldFollowUp: true, isFollowedUp: true },
  { patientId: "p8", dept: "cardio", shouldFollowUp: true, isFollowedUp: false },
  { patientId: "p9", dept: "cardio", shouldFollowUp: true, isFollowedUp: false },
  { patientId: "p10", dept: "cardio", shouldFollowUp: true, isFollowedUp: false },
];

describe("computeFollowUpRatesV13", () => {
  // 算式：10 患者全部应随访（should=10），已随访 7（followed=7），失访 3（lost=3）
  // shouldRate=10/10×100=100; followedRate=7/10×100=70; lostRate=3/10×100=30
  it("should=100, followed=70, lost=30", () => {
    const r = computeFollowUpRatesV13(patients);
    expect(r.shouldRate).toBe(100);
    expect(r.followedRate).toBe(70);
    expect(r.lostRate).toBe(30);
  });
  it("空态 → 全 0", () => {
    expect(computeFollowUpRatesV13([]).shouldRate).toBe(0);
  });
});

describe("identifyLostToFollowUpV13", () => {
  // 算式：应随访未随访 = p8/p9/p10（3 人）
  it("失访 = [p8, p9, p10]", () => {
    expect(identifyLostToFollowUpV13(patients)).toEqual(["p8", "p9", "p10"]);
  });
});

describe("computeFollowUpAdherenceScoreV13", () => {
  // 算式：已随访 7 / 应随访 10 → 7/10×100 = 70
  it("adherence = 70", () => {
    expect(computeFollowUpAdherenceScoreV13(patients)).toBe(70);
  });
  it("空态 → 0", () => {
    expect(computeFollowUpAdherenceScoreV13([])).toBe(0);
  });
});

describe("followUpAdherenceV13Routes 读路由", () => {
  it("GET /api/v1/follow-up-adherence 路由存在且 auth:true", () => {
    const route = followUpAdherenceV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/follow-up-adherence",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
